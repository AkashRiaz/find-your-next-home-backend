import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { IModerator } from "./moderationAction.interface";

/**
 * Returns the user an action targets, after checking the admin may act on them:
 * - not themselves
 * - nobody can act on a SUPER_ADMIN
 * - only a SUPER_ADMIN can act on another ADMIN
 */
export const findModeratableUserOrThrow = async (
  targetUserId: string,
  moderator: IModerator,
) => {
  if (targetUserId === moderator.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot take moderation action on yourself",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, status: true, isDeleted: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const isProtected =
    user.role === UserRole.SUPER_ADMIN ||
    (user.role === UserRole.ADMIN && moderator.role !== UserRole.SUPER_ADMIN);

  if (isProtected) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You don't have permission to take action on this account",
    );
  }

  return user;
};

export const findPropertyOrThrow = async (propertyId: string) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, title: true, status: true, ownerId: true },
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  return property;
};

export const findReportOrThrow = async (reportId: string) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, status: true },
  });

  if (!report) {
    throw new AppError(httpStatus.NOT_FOUND, "Report not found");
  }

  return report;
};
