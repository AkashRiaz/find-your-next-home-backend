import { z } from "zod";

export const conversationIdParamsSchema = z.object({
  id: z.uuid({ message: "Conversation id must be a valid UUID" }),
});

export const startConversationBodySchema = z
  .object({
    propertyId: z.uuid({ message: "Property id must be a valid UUID" }),
  })
  .strict();
