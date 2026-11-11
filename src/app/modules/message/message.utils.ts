import httpStatus from "http-status";
import { MessageType } from "../../../generated/prisma/enums";
import type { MessageGetPayload } from "../../../generated/prisma/models/Message";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  MESSAGE_EDIT_WINDOW_MINUTES,
  type messageSelectFields,
} from "./message.constant";

type MessageRow = MessageGetPayload<{ select: typeof messageSelectFields }>;

/**
 * Shapes a message for the logged-in user.
 * A deleted message keeps its place in the chat, but its text is hidden.
 */
export const toMessageResponse = (row: MessageRow, userId: string) => ({
  id: row.id,
  conversationId: row.conversationId,
  clientMessageId: row.clientMessageId,
  type: row.type,
  body: row.deletedAt ? null : row.body,
  isMine: row.senderId === userId,
  isEdited: Boolean(row.editedAt),
  isDeleted: Boolean(row.deletedAt),
  sender: row.sender,
  createdAt: row.createdAt,
  editedAt: row.editedAt,
});

/** Throws if the other person's account is gone, so nobody writes into the void. */
export const ensureRecipientIsAvailable = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDeleted: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This user is no longer available",
    );
  }
};

/**
 * Returns a message in this conversation that `userId` sent and that is not deleted.
 * Messages from others are reported as "not found".
 */
export const findOwnMessageOrThrow = async (
  messageId: string,
  conversationId: string,
  userId: string,
) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      type: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  if (
    !message ||
    message.conversationId !== conversationId ||
    message.senderId !== userId ||
    message.deletedAt
  ) {
    throw new AppError(httpStatus.NOT_FOUND, "Message not found");
  }

  if (message.type !== MessageType.TEXT) {
    throw new AppError(httpStatus.BAD_REQUEST, "System messages cannot be changed");
  }

  return message;
};

/** Throws once the edit window has passed. */
export const ensureStillEditable = (createdAt: Date): void => {
  const windowMs = MESSAGE_EDIT_WINDOW_MINUTES * 60 * 1000;

  if (Date.now() - createdAt.getTime() > windowMs) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Messages can only be edited within ${MESSAGE_EDIT_WINDOW_MINUTES} minutes of sending`,
    );
  }
};
