import { z } from "zod";

const userIdSchema = z.uuid({ message: "User id must be a valid UUID" });

export const blockedUserIdParamsSchema = z.object({
  blockedId: userIdSchema,
});

export const blockUserBodySchema = z
  .object({
    blockedId: userIdSchema,
  })
  .strict();
