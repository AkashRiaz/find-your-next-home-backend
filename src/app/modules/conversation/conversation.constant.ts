import type { ConversationSelect } from "../../../generated/prisma/models/Conversation";

/** Which side of the conversation the logged-in user is on. */
export const CONVERSATION_ROLES = ["seeker", "owner"] as const;
export type ConversationRole = (typeof CONVERSATION_ROLES)[number];

const userPreview = { select: { id: true, name: true, avatarUrl: true } } as const;

/**
 * Raw fields loaded for a conversation. They are turned into the response
 * shape by `toConversationResponse`, which works out "the other person" and unread state.
 */
export const conversationSelectFields = {
  id: true,
  seekerId: true,
  seekerLastReadAt: true,
  ownerLastReadAt: true,
  lastMessageAt: true,
  createdAt: true,
  seeker: userPreview,
  property: {
    select: {
      id: true,
      title: true,
      status: true,
      monthlyRent: true,
      ownerId: true,
      owner: userPreview,
      // Cover image first, then by display order.
      images: {
        orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { imageUrl: true, altText: true },
      },
    },
  },
  messages: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      id: true,
      senderId: true,
      type: true,
      body: true,
      createdAt: true,
      deletedAt: true,
    },
  },
} as const satisfies ConversationSelect;
