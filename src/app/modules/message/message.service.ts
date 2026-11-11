import httpStatus from "http-status";
import { MessageType, NotificationType } from "../../../generated/prisma/enums";
import type { MessageWhereInput } from "../../../generated/prisma/models/Message";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { findConversationForParticipantOrThrow } from "../conversation/conversation.utils";
import { createNotification } from "../notification/notification.utils";
import { ensureNotBlockedEitherWay } from "../userBlock/userBlock.utils";
import { messageSelectFields } from "./message.constant";
import type {
  IEditMessagePayload,
  ISendMessagePayload,
} from "./message.interface";
import {
  ensureRecipientIsAvailable,
  ensureStillEditable,
  findOwnMessageOrThrow,
  toMessageResponse,
} from "./message.utils";

/** Messages in a conversation, newest first. The app reverses them for display. */
const getMessages = async (
  userId: string,
  conversationId: string,
  query: IQuery,
) => {
  await findConversationForParticipantOrThrow(conversationId, userId);

  const limit = query.limit ? parseInt(query.limit, 10) : 30;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["createdAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: MessageWhereInput[] = [{ conversationId }];

  const messages = await prisma.message.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: messageSelectFields,
  });

  const total = await prisma.message.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: messages.map((message) => toMessageResponse(message, userId)),

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Sends a text message.
 * - Neither side may have blocked the other, and the recipient must still exist.
 * - Retrying with the same clientMessageId returns the saved message instead of a duplicate.
 * - The message, the conversation's timestamps and the recipient's notification are saved together.
 * - The recipient gets at most one unread "new message" notification per conversation,
 *   so a burst of messages doesn't flood their notification list.
 */
const sendMessage = async (
  userId: string,
  conversationId: string,
  payload: ISendMessagePayload,
) => {
  const conversation = await findConversationForParticipantOrThrow(
    conversationId,
    userId,
  );

  // Duplicate send (e.g. the app retried after a timeout)
  const existing = await prisma.message.findUnique({
    where: {
      senderId_clientMessageId: {
        senderId: userId,
        clientMessageId: payload.clientMessageId,
      },
    },
    select: messageSelectFields,
  });

  if (existing) {
    if (existing.conversationId !== conversationId) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This clientMessageId was already used in another conversation",
      );
    }

    return { isNew: false, message: toMessageResponse(existing, userId) };
  }

  await ensureNotBlockedEitherWay(userId, conversation.otherUserId);
  await ensureRecipientIsAvailable(conversation.otherUserId);

  const now = new Date();

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        clientMessageId: payload.clientMessageId,
        type: MessageType.TEXT,
        body: payload.body,
        createdAt: now,
      },
      select: messageSelectFields,
    });

    // Bump the inbox order, and mark the conversation read for the sender.
    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
        ...(conversation.role === "seeker"
          ? { seekerLastReadAt: now }
          : { ownerLastReadAt: now }),
      },
    });

    const hasUnreadNotification = await tx.notification.findFirst({
      where: {
        userId: conversation.otherUserId,
        type: NotificationType.NEW_MESSAGE,
        isRead: false,
        data: { path: ["conversationId"], equals: conversationId },
      },
      select: { id: true },
    });

    if (!hasUnreadNotification) {
      await createNotification(
        {
          userId: conversation.otherUserId,
          actorId: userId,
          type: NotificationType.NEW_MESSAGE,
          title: "New message",
          body: conversation.propertyTitle
            ? `About "${conversation.propertyTitle}"`
            : null,
          data: { conversationId, propertyId: conversation.propertyId },
        },
        tx,
      );
    }

    return created;
  });

  return { isNew: true, message: toMessageResponse(message, userId) };
};

/** Fixes a typo shortly after sending. The message shows as edited. */
const editMessage = async (
  userId: string,
  conversationId: string,
  messageId: string,
  payload: IEditMessagePayload,
) => {
  await findConversationForParticipantOrThrow(conversationId, userId);
  const message = await findOwnMessageOrThrow(messageId, conversationId, userId);
  ensureStillEditable(message.createdAt);

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { body: payload.body, editedAt: new Date() },
    select: messageSelectFields,
  });

  return toMessageResponse(updated, userId);
};

/**
 * "Deletes" a message for both people: its text disappears from the chat.
 * The text is kept in the database, so a reported message stays available
 * to moderators as evidence.
 */
const deleteMessage = async (
  userId: string,
  conversationId: string,
  messageId: string,
) => {
  await findConversationForParticipantOrThrow(conversationId, userId);
  await findOwnMessageOrThrow(messageId, conversationId, userId);

  const deleted = await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
    select: messageSelectFields,
  });

  return toMessageResponse(deleted, userId);
};

export const MessageService = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
};
