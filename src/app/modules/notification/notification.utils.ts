import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateNotificationInput } from "./notification.interface";

/**
 * Returns the notification if it belongs to `userId`.
 * Someone else's notification is reported as "not found", so ids are not leaked.
 */
export const findOwnNotificationOrThrow = async (id: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, isRead: true },
  });

  if (!notification || notification.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  return notification;
};

/** Throws unless the user exists and their account is not deleted. */
export const ensureRecipientExists = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDeleted: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
};

/**
 * Creates a notification for a user. Other modules call this when something
 * happens that the user should hear about (a new message, a report update...).
 * Pass `tx` to create it inside the caller's transaction, so the notification
 * is only saved if the change it describes is saved too.
 */
export const createNotification = (
  input: ICreateNotificationInput,
  tx: Prisma.TransactionClient = prisma,
) =>
  tx.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data as Prisma.InputJsonObject | undefined,
    },
    select: { id: true },
  });
