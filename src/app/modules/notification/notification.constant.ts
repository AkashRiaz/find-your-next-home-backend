import type { NotificationSelect } from "../../../generated/prisma/models/Notification";

// Keep in sync with the column sizes in prisma/schema/notification.prisma.
export const NOTIFICATION_TITLE_MAX_LENGTH = 200;

// body is a Text column, so this limit is an app rule that keeps notifications short.
export const NOTIFICATION_BODY_MAX_LENGTH = 1000;

/** Fields the recipient sees for each notification. */
export const notificationSelectFields = {
  id: true,
  type: true,
  title: true,
  body: true,
  data: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  actor: { select: { id: true, name: true, avatarUrl: true } },
} as const satisfies NotificationSelect;
