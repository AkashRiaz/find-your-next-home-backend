import type { ModerationActionType } from "../../../generated/prisma/enums";
import type { ModerationActionSelect } from "../../../generated/prisma/models/ModerationAction";

// reason is a Text column, so this limit is an app rule.
export const MODERATION_REASON_MAX_LENGTH = 1000;

/** What each action is applied to. */
export const ACTION_TARGET: Record<ModerationActionType, "user" | "property"> = {
  WARNING: "user",
  SUSPEND_USER: "user",
  RESTORE_USER: "user",
  SUSPEND_LISTING: "property",
  RESTORE_LISTING: "property",
};

/** Fields shown for each entry in the moderation log. */
export const moderationActionSelectFields = {
  id: true,
  action: true,
  reason: true,
  createdAt: true,
  admin: { select: { id: true, name: true, email: true } },
  targetUser: { select: { id: true, name: true, email: true, status: true } },
  property: {
    select: {
      id: true,
      title: true,
      status: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  },
  report: { select: { id: true, reason: true, status: true } },
} as const satisfies ModerationActionSelect;
