import { NotificationType } from "../../../generated/prisma/enums";
import type { NotificationWhereInput } from "../../../generated/prisma/models/Notification";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { isEnumValue } from "../property/property.utils";
import { notificationSelectFields } from "./notification.constant";
import type { ISendSystemNotificationPayload } from "./notification.interface";
import {
  createNotification,
  ensureRecipientExists,
  findOwnNotificationOrThrow,
} from "./notification.utils";

// ---------------------------------------------------------------------------
// Recipient (logged-in user)
// ---------------------------------------------------------------------------

/** The user's notifications, newest first. */
const getMyNotifications = async (userId: string, query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["createdAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: NotificationWhereInput[] = [{ userId }];

  // Read / unread filter
  if (query.isRead === "true" || query.isRead === "false") {
    andConditions.push({ isRead: query.isRead === "true" });
  }

  // Type filter
  if (isEnumValue(NotificationType, query.type)) {
    andConditions.push({ type: query.type });
  }

  const notifications = await prisma.notification.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: notificationSelectFields,
  });

  const total = await prisma.notification.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: notifications,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Number shown on the bell icon. */
const getUnreadCount = async (userId: string) => {
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { unreadCount };
};

/**
 * Marks one notification as read.
 * Already-read notifications are returned unchanged, so readAt keeps the first read time.
 */
const markAsRead = async (userId: string, id: string) => {
  const notification = await findOwnNotificationOrThrow(id, userId);

  if (notification.isRead) {
    return prisma.notification.findUniqueOrThrow({
      where: { id },
      select: notificationSelectFields,
    });
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
    select: notificationSelectFields,
  });
};

const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return { updatedCount: result.count };
};

const deleteNotification = async (userId: string, id: string) => {
  await findOwnNotificationOrThrow(id, userId);

  return prisma.notification.delete({
    where: { id },
    select: { id: true, createdAt: true },
  });
};

/** Clears read notifications. Unread ones are kept so nothing is missed. */
const deleteReadNotifications = async (userId: string) => {
  const result = await prisma.notification.deleteMany({
    where: { userId, isRead: true },
  });

  return { deletedCount: result.count };
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/**
 * Sends a SYSTEM notification to one user, e.g. a warning or an announcement.
 * It is sent from the platform, not from the admin personally, so actorId stays empty.
 */
const sendSystemNotification = async (
  payload: ISendSystemNotificationPayload,
) => {
  await ensureRecipientExists(payload.userId);

  const { id } = await createNotification({
    userId: payload.userId,
    type: NotificationType.SYSTEM,
    title: payload.title,
    body: payload.body,
    data: payload.data,
  });

  return prisma.notification.findUniqueOrThrow({
    where: { id },
    select: notificationSelectFields,
  });
};

export const NotificationService = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  sendSystemNotification,
};
