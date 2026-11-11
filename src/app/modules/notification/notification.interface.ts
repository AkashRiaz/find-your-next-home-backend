import type { NotificationType } from "../../../generated/prisma/enums";

/** Admin-sent message to one user. Always created with type SYSTEM. */
export interface ISendSystemNotificationPayload {
  userId: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
}

/** Used by other modules to notify a user about an event. */
export interface ICreateNotificationInput {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
}
