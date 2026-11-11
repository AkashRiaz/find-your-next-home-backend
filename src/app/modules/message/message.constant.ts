import type { MessageSelect } from "../../../generated/prisma/models/Message";

// body is a Text column, so this limit is an app rule that keeps messages chat-sized.
export const MESSAGE_BODY_MAX_LENGTH = 2000;

/** How long after sending a message its sender may still edit it. */
export const MESSAGE_EDIT_WINDOW_MINUTES = 15;

/** Raw fields loaded for a message. `toMessageResponse` hides the text of deleted ones. */
export const messageSelectFields = {
  id: true,
  conversationId: true,
  senderId: true,
  clientMessageId: true,
  type: true,
  body: true,
  createdAt: true,
  editedAt: true,
  deletedAt: true,
  sender: { select: { id: true, name: true, avatarUrl: true } },
} as const satisfies MessageSelect;
