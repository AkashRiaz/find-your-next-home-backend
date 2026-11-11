import { z } from "zod";
import { MESSAGE_BODY_MAX_LENGTH } from "./message.constant";

const conversationIdSchema = z.uuid({
  message: "Conversation id must be a valid UUID",
});

const messageBodySchema = z
  .string({ message: "Message text is required" })
  .trim()
  .min(1, { message: "Message cannot be empty" })
  .max(MESSAGE_BODY_MAX_LENGTH, {
    message: `Message must be at most ${MESSAGE_BODY_MAX_LENGTH} characters`,
  });

export const conversationIdParamsSchema = z.object({
  conversationId: conversationIdSchema,
});

export const messageIdParamsSchema = z.object({
  conversationId: conversationIdSchema,
  messageId: z.uuid({ message: "Message id must be a valid UUID" }),
});

export const sendMessageBodySchema = z
  .object({
    clientMessageId: z.uuid({ message: "clientMessageId must be a valid UUID" }),
    body: messageBodySchema,
  })
  .strict();

export const editMessageBodySchema = z
  .object({
    body: messageBodySchema,
  })
  .strict();
