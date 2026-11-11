import { z } from "zod";
import { ModerationActionType } from "../../../generated/prisma/enums";
import {
  ACTION_TARGET,
  MODERATION_REASON_MAX_LENGTH,
} from "./moderationAction.constant";

const uuidSchema = (field: string) =>
  z.uuid({ message: `${field} must be a valid UUID` });

export const moderationActionIdParamsSchema = z.object({
  id: uuidSchema("Moderation action id"),
});

export const createModerationActionBodySchema = z
  .object({
    action: z.enum(ModerationActionType, {
      message: `Action must be one of: ${Object.values(ModerationActionType).join(", ")}`,
    }),
    // Every action needs a written reason, for the audit trail and for the user.
    reason: z
      .string({ message: "Reason is required" })
      .trim()
      .min(1, { message: "Reason cannot be empty" })
      .max(MODERATION_REASON_MAX_LENGTH, {
        message: `Reason must be at most ${MODERATION_REASON_MAX_LENGTH} characters`,
      }),
    targetUserId: uuidSchema("Target user id").optional(),
    propertyId: uuidSchema("Property id").optional(),
    reportId: uuidSchema("Report id").optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    const target = ACTION_TARGET[body.action];

    if (target === "user" && (!body.targetUserId || body.propertyId)) {
      ctx.addIssue({
        code: "custom",
        path: ["targetUserId"],
        message: `${body.action} needs targetUserId (and no propertyId)`,
      });
    }

    if (target === "property" && (!body.propertyId || body.targetUserId)) {
      ctx.addIssue({
        code: "custom",
        path: ["propertyId"],
        message: `${body.action} needs propertyId (and no targetUserId)`,
      });
    }
  });
