import { UserRole } from "../../../generated/prisma/enums";
import type { UserBlockSelect } from "../../../generated/prisma/models/UserBlock";

/** Staff accounts can't be blocked, so users can always hear from support and moderators. */
export const UNBLOCKABLE_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

/** A block as the blocker sees it. */
export const userBlockSelectFields = {
  id: true,
  createdAt: true,
  blocked: { select: { id: true, name: true, avatarUrl: true } },
} as const satisfies UserBlockSelect;
