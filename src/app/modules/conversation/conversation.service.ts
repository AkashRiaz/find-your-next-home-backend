import type { ConversationWhereInput } from "../../../generated/prisma/models/Conversation";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { parseIdQuery } from "../property/property.utils";
import { conversationSelectFields } from "./conversation.constant";
import type { IStartConversationPayload } from "./conversation.interface";
import {
  ensureCanContactOwner,
  findConversationForParticipantOrThrow,
  isConversationRole,
  toConversationResponse,
} from "./conversation.utils";

/** Conversations the user takes part in, as the seeker or as the listing owner. */
const participantConditions = (userId: string): ConversationWhereInput => ({
  OR: [
    { seekerId: userId },
    // Owners only see a conversation once the seeker has sent something.
    { property: { ownerId: userId }, lastMessageAt: { not: null } },
  ],
});

/**
 * Opens the conversation between a seeker and a listing's owner.
 * There is one conversation per seeker per listing, so asking again
 * returns the existing one instead of failing.
 */
const startConversation = async (
  seekerId: string,
  payload: IStartConversationPayload,
) => {
  await ensureCanContactOwner(payload.propertyId, seekerId);

  const existing = await prisma.conversation.findUnique({
    where: {
      propertyId_seekerId: { propertyId: payload.propertyId, seekerId },
    },
    select: conversationSelectFields,
  });

  if (existing) {
    return { isNew: false, conversation: toConversationResponse(existing, seekerId) };
  }

  const conversation = await prisma.conversation.create({
    data: { propertyId: payload.propertyId, seekerId },
    select: conversationSelectFields,
  });

  return { isNew: true, conversation: toConversationResponse(conversation, seekerId) };
};

/** The user's inbox, most recent activity first. */
const getMyConversations = async (userId: string, query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["lastMessageAt", "createdAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "lastMessageAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: ConversationWhereInput[] = [participantConditions(userId)];

  // Role filter: conversations where I'm asking, or where I'm the owner
  if (isConversationRole(query.role)) {
    andConditions.push(
      query.role === "seeker"
        ? { seekerId: userId }
        : { property: { ownerId: userId } },
    );
  }

  // Property filter, e.g. every inquiry about one of my listings
  const propertyId = parseIdQuery(query.propertyId, "propertyId");
  if (propertyId) {
    andConditions.push({ propertyId });
  }

  // Search
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          property: {
            title: {
              contains: query.searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          seeker: {
            name: {
              contains: query.searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          property: {
            owner: {
              name: {
                contains: query.searchTerm,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    // Conversations without messages yet go last, not first.
    // ("nulls" is only allowed on optional fields, so createdAt sorts plainly.)
    orderBy:
      sortBy === "lastMessageAt"
        ? { lastMessageAt: { sort: sortOrder, nulls: "last" } }
        : { createdAt: sortOrder },

    select: conversationSelectFields,
  });

  const total = await prisma.conversation.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: conversations.map((row) => toConversationResponse(row, userId)),

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Number of conversations with messages the user hasn't seen, for the inbox badge. */
const getUnreadConversationCount = async (userId: string) => {
  const unreadAsSeeker = await prisma.conversation.count({
    where: {
      seekerId: userId,
      lastMessageAt: { not: null },
      // Something from the other person, newer than my last visit.
      // Sending a message also stamps my lastReadAt, so my own messages never count.
      messages: { some: { senderId: { not: userId } } },
      OR: [
        { seekerLastReadAt: null },
        { lastMessageAt: { gt: prisma.conversation.fields.seekerLastReadAt } },
      ],
    },
  });

  const unreadAsOwner = await prisma.conversation.count({
    where: {
      property: { ownerId: userId },
      lastMessageAt: { not: null },
      messages: { some: { senderId: { not: userId } } },
      OR: [
        { ownerLastReadAt: null },
        { lastMessageAt: { gt: prisma.conversation.fields.ownerLastReadAt } },
      ],
    },
  });

  return { unreadCount: unreadAsSeeker + unreadAsOwner };
};

const getSingleConversation = async (userId: string, id: string) => {
  await findConversationForParticipantOrThrow(id, userId);

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id },
    select: conversationSelectFields,
  });

  return toConversationResponse(conversation, userId);
};

/** Records that the user has seen everything in this conversation up to now. */
const markConversationAsRead = async (userId: string, id: string) => {
  const { role } = await findConversationForParticipantOrThrow(id, userId);

  const now = new Date();

  const conversation = await prisma.conversation.update({
    where: { id },
    data: role === "seeker" ? { seekerLastReadAt: now } : { ownerLastReadAt: now },
    select: conversationSelectFields,
  });

  return toConversationResponse(conversation, userId);
};

export const ConversationService = {
  startConversation,
  getMyConversations,
  getUnreadConversationCount,
  getSingleConversation,
  markConversationAsRead,
};
