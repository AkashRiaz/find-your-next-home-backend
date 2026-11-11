import httpStatus from "http-status";
import type { UserBlockWhereInput } from "../../../generated/prisma/models/UserBlock";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { userBlockSelectFields } from "./userBlock.constant";
import type { IBlockUserPayload } from "./userBlock.interface";
import {
  ensureNotAlreadyBlocked,
  ensureUserCanBeBlocked,
} from "./userBlock.utils";

/** The users this user has blocked, most recent first. */
const getMyBlockedUsers = async (blockerId: string, query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["createdAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: UserBlockWhereInput[] = [{ blockerId }];

  // Search
  if (query.searchTerm) {
    andConditions.push({
      blocked: {
        name: {
          contains: query.searchTerm,
          mode: "insensitive",
        },
      },
    });
  }

  const blocks = await prisma.userBlock.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: userBlockSelectFields,
  });

  const total = await prisma.userBlock.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: blocks,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Tells the app whether to show "Block" or "Unblock" on a profile.
 * Only says whether *you* blocked them; whether they blocked you stays private.
 */
const checkBlockStatus = async (blockerId: string, blockedId: string) => {
  const block = await prisma.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    select: { id: true },
  });

  return { userId: blockedId, isBlocked: Boolean(block) };
};

const blockUser = async (blockerId: string, payload: IBlockUserPayload) => {
  await ensureUserCanBeBlocked(blockerId, payload.blockedId);
  await ensureNotAlreadyBlocked(blockerId, payload.blockedId);

  return prisma.userBlock.create({
    data: { blockerId, blockedId: payload.blockedId },
    select: userBlockSelectFields,
  });
};

const unblockUser = async (blockerId: string, blockedId: string) => {
  const block = await prisma.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    select: { id: true },
  });

  if (!block) {
    throw new AppError(httpStatus.NOT_FOUND, "You have not blocked this user");
  }

  return prisma.userBlock.delete({
    where: { id: block.id },
    select: { id: true, createdAt: true },
  });
};

export const UserBlockService = {
  getMyBlockedUsers,
  checkBlockStatus,
  blockUser,
  unblockUser,
};
