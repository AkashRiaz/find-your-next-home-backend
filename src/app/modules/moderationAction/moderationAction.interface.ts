import type {
  ModerationActionType,
  UserRole,
} from "../../../generated/prisma/enums";

/** Set targetUserId for user actions, propertyId for listing actions. */
export interface ICreateModerationActionPayload {
  action: ModerationActionType;
  reason: string;
  targetUserId?: string;
  propertyId?: string;
  reportId?: string;
}

/** The admin taking the action. */
export interface IModerator {
  userId: string;
  role: UserRole;
}
