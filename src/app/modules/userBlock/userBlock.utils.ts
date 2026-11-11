import httpStatus from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { UNBLOCKABLE_ROLES } from "./userBlock.constant";

/**
 * Checks that `blockerId` may block `blockedId`:
 * - not themselves
 * - the user exists and is not deleted
 * - the user is not staff (admins stay reachable)
 */
export const ensureUserCanBeBlocked = async (
  blockerId: string,
  blockedId: string,
): Promise<void> => {
  if (blockerId === blockedId) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot block yourself");
  }

  const user = await prisma.user.findUnique({
    where: { id: blockedId },
    select: { role: true, isDeleted: true },
  });

  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (UNBLOCKABLE_ROLES.includes(user.role)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Admin accounts cannot be blocked. Report the user instead if needed",
    );
  }
};

export const ensureNotAlreadyBlocked = async (
  blockerId: string,
  blockedId: string,
): Promise<void> => {
  const existingBlock = await prisma.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    select: { id: true },
  });

  if (existingBlock) {
    throw new AppError(httpStatus.CONFLICT, "You have already blocked this user");
  }
};

/** True if either user has blocked the other. */
export const isBlockedEitherWay = async (
  userId: string,
  otherUserId: string,
): Promise<boolean> => {
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
    select: { id: true },
  });

  return Boolean(block);
};

/**
 * Used by messaging: throws if either user has blocked the other.
 * The message doesn't say who blocked whom, so a block stays private.
 */
export const ensureNotBlockedEitherWay = async (
  userId: string,
  otherUserId: string,
): Promise<void> => {
  if (await isBlockedEitherWay(userId, otherUserId)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can't contact this user",
    );
  }
};
