import httpStatus from "http-status";
import { ListingStatus } from "../../../generated/prisma/enums";
import type { ConversationGetPayload } from "../../../generated/prisma/models/Conversation";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ensureNotBlockedEitherWay } from "../userBlock/userBlock.utils";
import {
  CONVERSATION_ROLES,
  type ConversationRole,
  type conversationSelectFields,
} from "./conversation.constant";

/**
 * Checks that a user may start a conversation about this property:
 * - it must be a published listing
 * - it must not be their own listing
 * - neither side has blocked the other
 * Returns the owner's id.
 */
export const ensureCanContactOwner = async (
  propertyId: string,
  seekerId: string,
): Promise<string> => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { ownerId: true, status: true },
  });

  if (!property || property.status !== ListingStatus.PUBLISHED) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (property.ownerId === seekerId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot start a conversation about your own listing",
    );
  }

  await ensureNotBlockedEitherWay(seekerId, property.ownerId);

  return property.ownerId;
};

/**
 * Returns the conversation if `userId` takes part in it, with their role
 * and the other participant's id. Anyone else gets "not found".
 * Used by the message module too.
 */
export const findConversationForParticipantOrThrow = async (
  id: string,
  userId: string,
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      seekerId: true,
      propertyId: true,
      property: { select: { ownerId: true, title: true } },
    },
  });

  const ownerId = conversation?.property.ownerId;

  if (!conversation || (conversation.seekerId !== userId && ownerId !== userId)) {
    throw new AppError(httpStatus.NOT_FOUND, "Conversation not found");
  }

  const role: ConversationRole =
    conversation.seekerId === userId ? "seeker" : "owner";

  return {
    id: conversation.id,
    propertyId: conversation.propertyId,
    propertyTitle: conversation.property.title,
    seekerId: conversation.seekerId,
    ownerId: conversation.property.ownerId,
    role,
    otherUserId: role === "seeker" ? conversation.property.ownerId : conversation.seekerId,
  };
};

export const isConversationRole = (value: unknown): value is ConversationRole =>
  CONVERSATION_ROLES.includes(value as ConversationRole);

type ConversationRow = ConversationGetPayload<{
  select: typeof conversationSelectFields;
}>;

/**
 * Shapes a conversation for the logged-in user:
 * shows the *other* person, the last message (hidden if deleted),
 * and whether there is anything new since they last opened it.
 */
export const toConversationResponse = (row: ConversationRow, userId: string) => {
  const role: ConversationRole = row.seekerId === userId ? "seeker" : "owner";
  const myLastReadAt = role === "seeker" ? row.seekerLastReadAt : row.ownerLastReadAt;
  const lastMessage = row.messages[0];

  const hasUnread = Boolean(
    lastMessage &&
      lastMessage.senderId !== userId &&
      (!myLastReadAt || lastMessage.createdAt > myLastReadAt),
  );

  return {
    id: row.id,
    myRole: role,
    otherUser: role === "seeker" ? row.property.owner : row.seeker,
    property: {
      id: row.property.id,
      title: row.property.title,
      status: row.property.status,
      monthlyRent: row.property.monthlyRent,
      coverImage: row.property.images[0] ?? null,
    },
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderId: lastMessage.senderId,
          type: lastMessage.type,
          body: lastMessage.deletedAt ? null : lastMessage.body,
          isDeleted: Boolean(lastMessage.deletedAt),
          createdAt: lastMessage.createdAt,
        }
      : null,
    hasUnread,
    lastMessageAt: row.lastMessageAt,
    createdAt: row.createdAt,
  };
};
