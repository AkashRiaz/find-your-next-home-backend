import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import {
  ListingStatus,
  ModerationActionType,
  NotificationType,
  ReportStatus,
  UserStatus,
} from "../../../generated/prisma/enums";
import type { ModerationActionWhereInput } from "../../../generated/prisma/models/ModerationAction";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { createNotification } from "../notification/notification.utils";
import { isEnumValue, parseIdQuery } from "../property/property.utils";
import { moderationActionSelectFields } from "./moderationAction.constant";
import type {
  ICreateModerationActionPayload,
  IModerator,
} from "./moderationAction.interface";
import {
  findModeratableUserOrThrow,
  findPropertyOrThrow,
  findReportOrThrow,
} from "./moderationAction.utils";

type Tx = Prisma.TransactionClient;

/** The validation schema already requires the right target; this keeps TypeScript and runtime in agreement. */
const requireId = (value: string | undefined, field: string): string => {
  if (!value) {
    throw new AppError(httpStatus.BAD_REQUEST, `${field} is required for this action`);
  }

  return value;
};

/**
 * Checks the target and returns the change to apply, run inside the transaction.
 * Each change also tells the affected user what happened and why.
 */
const prepareAction = async (
  payload: ICreateModerationActionPayload,
  moderator: IModerator,
): Promise<(tx: Tx) => Promise<void>> => {
  const { action, reason } = payload;

  switch (action) {
    case ModerationActionType.WARNING: {
      const user = await findModeratableUserOrThrow(requireId(payload.targetUserId, "targetUserId"), moderator);

      return async (tx) => {
        await createNotification(
          {
            userId: user.id,
            type: NotificationType.SYSTEM,
            title: "Warning from the moderation team",
            body: reason,
          },
          tx,
        );
      };
    }

    case ModerationActionType.SUSPEND_USER: {
      const user = await findModeratableUserOrThrow(requireId(payload.targetUserId, "targetUserId"), moderator);

      if (user.status === UserStatus.SUSPENDED) {
        throw new AppError(httpStatus.CONFLICT, "This user is already suspended");
      }

      // checkAuth rejects suspended users on every request, so they lose access at once.
      return async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { status: UserStatus.SUSPENDED },
        });

        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      };
    }

    case ModerationActionType.RESTORE_USER: {
      const user = await findModeratableUserOrThrow(requireId(payload.targetUserId, "targetUserId"), moderator);

      if (user.status !== UserStatus.SUSPENDED) {
        throw new AppError(httpStatus.BAD_REQUEST, "Only a suspended user can be restored");
      }

      return async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { status: UserStatus.ACTIVE },
        });

        await createNotification(
          {
            userId: user.id,
            type: NotificationType.SYSTEM,
            title: "Your account has been restored",
            body: reason,
          },
          tx,
        );
      };
    }

    case ModerationActionType.SUSPEND_LISTING: {
      const property = await findPropertyOrThrow(requireId(payload.propertyId, "propertyId"));

      if (property.status === ListingStatus.SUSPENDED) {
        throw new AppError(httpStatus.CONFLICT, "This listing is already suspended");
      }

      return async (tx) => {
        await tx.property.update({
          where: { id: property.id },
          data: { status: ListingStatus.SUSPENDED },
        });

        await createNotification(
          {
            userId: property.ownerId,
            type: NotificationType.LISTING_SUSPENDED,
            title: "Your listing has been suspended",
            body: reason,
            data: { propertyId: property.id },
          },
          tx,
        );
      };
    }

    case ModerationActionType.RESTORE_LISTING: {
      const property = await findPropertyOrThrow(requireId(payload.propertyId, "propertyId"));

      if (property.status !== ListingStatus.SUSPENDED) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Only a suspended listing can be restored",
        );
      }

      // Restored listings go back to DRAFT, so the owner checks them before republishing.
      return async (tx) => {
        await tx.property.update({
          where: { id: property.id },
          data: { status: ListingStatus.DRAFT },
        });

        await createNotification(
          {
            userId: property.ownerId,
            type: NotificationType.SYSTEM,
            title: "Your listing has been restored",
            body: `${reason}\n\nIt is saved as a draft. Review it and publish it again when ready.`,
            data: { propertyId: property.id },
          },
          tx,
        );
      };
    }
  }
};

/**
 * Takes a moderation action: applies it, records it in the log and notifies
 * the affected user, all in one transaction.
 * If it's linked to a pending report, that report moves to REVIEWING;
 * closing the report is done separately, with a resolution note.
 */
const createModerationAction = async (
  moderator: IModerator,
  payload: ICreateModerationActionPayload,
) => {
  const report = payload.reportId
    ? await findReportOrThrow(payload.reportId)
    : null;

  const applyAction = await prepareAction(payload, moderator);

  return prisma.$transaction(async (tx) => {
    await applyAction(tx);

    if (report?.status === ReportStatus.PENDING) {
      await tx.report.update({
        where: { id: report.id },
        data: { status: ReportStatus.REVIEWING },
      });
    }

    return tx.moderationAction.create({
      data: {
        adminId: moderator.userId,
        action: payload.action,
        reason: payload.reason,
        targetUserId: payload.targetUserId,
        propertyId: payload.propertyId,
        reportId: payload.reportId,
      },
      select: moderationActionSelectFields,
    });
  });
};

/** The moderation log, newest first. Filter it to see one user's or listing's history. */
const getAllModerationActions = async (query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["createdAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: ModerationActionWhereInput[] = [];

  // Search
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          reason: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          targetUser: {
            OR: [
              { name: { contains: query.searchTerm, mode: "insensitive" } },
              { email: { contains: query.searchTerm, mode: "insensitive" } },
            ],
          },
        },
        {
          property: {
            title: {
              contains: query.searchTerm,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  // Action filter
  if (isEnumValue(ModerationActionType, query.action)) {
    andConditions.push({ action: query.action });
  }

  // Id filters
  const adminId = parseIdQuery(query.adminId, "adminId");
  if (adminId) {
    andConditions.push({ adminId });
  }

  const targetUserId = parseIdQuery(query.targetUserId, "targetUserId");
  if (targetUserId) {
    andConditions.push({ targetUserId });
  }

  const propertyId = parseIdQuery(query.propertyId, "propertyId");
  if (propertyId) {
    andConditions.push({ propertyId });
  }

  const reportId = parseIdQuery(query.reportId, "reportId");
  if (reportId) {
    andConditions.push({ reportId });
  }

  const actions = await prisma.moderationAction.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: moderationActionSelectFields,
  });

  const total = await prisma.moderationAction.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: actions,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSingleModerationAction = async (id: string) => {
  const action = await prisma.moderationAction.findUnique({
    where: { id },
    select: moderationActionSelectFields,
  });

  if (!action) {
    throw new AppError(httpStatus.NOT_FOUND, "Moderation action not found");
  }

  return action;
};

export const ModerationActionService = {
  createModerationAction,
  getAllModerationActions,
  getSingleModerationAction,
};
