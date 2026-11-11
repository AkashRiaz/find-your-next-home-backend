import httpStatus from "http-status";
import type { ReportWhereInput } from "../../../generated/prisma/models/Report";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { LIVE_STATUSES } from "../property/property.constant";
import {
  OPEN_REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type ReportTargetType,
} from "./report.constant";
import type { ICreateReportPayload } from "./report.interface";

type ReportTarget = Pick<
  ICreateReportPayload,
  "propertyId" | "reportedUserId" | "messageId"
>;

/**
 * Checks that the reporter is allowed to report this target:
 * - a property must be live (published or rented) and not their own
 * - a user must exist, not be deleted, and not be the reporter
 * - a message must be in a conversation the reporter takes part in,
 *   not deleted, and not sent by the reporter
 *
 * Targets the reporter can't see are reported as "not found", so ids are not leaked.
 */
export const ensureReportTargetIsValid = async (
  target: ReportTarget,
  reporterId: string,
): Promise<void> => {
  if (target.propertyId) {
    const property = await prisma.property.findUnique({
      where: { id: target.propertyId },
      select: { ownerId: true, status: true },
    });

    if (!property || !LIVE_STATUSES.includes(property.status)) {
      throw new AppError(httpStatus.NOT_FOUND, "Property not found");
    }

    if (property.ownerId === reporterId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You cannot report your own listing",
      );
    }
  }

  if (target.reportedUserId) {
    if (target.reportedUserId === reporterId) {
      throw new AppError(httpStatus.BAD_REQUEST, "You cannot report yourself");
    }

    const user = await prisma.user.findUnique({
      where: { id: target.reportedUserId },
      select: { isDeleted: true },
    });

    if (!user || user.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }
  }

  if (target.messageId) {
    const message = await prisma.message.findUnique({
      where: { id: target.messageId },
      select: {
        senderId: true,
        deletedAt: true,
        conversation: {
          select: { seekerId: true, property: { select: { ownerId: true } } },
        },
      },
    });

    const isParticipant =
      message?.conversation.seekerId === reporterId ||
      message?.conversation.property.ownerId === reporterId;

    if (!message || message.deletedAt || !isParticipant) {
      throw new AppError(httpStatus.NOT_FOUND, "Message not found");
    }

    if (message.senderId === reporterId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You cannot report your own message",
      );
    }
  }
};

/**
 * Throws if the reporter already has an open report on this target.
 * Once that report is resolved or dismissed, they may report again.
 */
export const ensureNoOpenReportForTarget = async (
  reporterId: string,
  target: ReportTarget,
): Promise<void> => {
  const existingReport = await prisma.report.findFirst({
    where: {
      reporterId,
      status: { in: [...OPEN_REPORT_STATUSES] },
      propertyId: target.propertyId,
      reportedUserId: target.reportedUserId,
      messageId: target.messageId,
    },
    select: { id: true },
  });

  if (existingReport) {
    throw new AppError(
      httpStatus.CONFLICT,
      "You have already reported this. We are reviewing your earlier report",
    );
  }
};

/**
 * Returns the report if it was submitted by `reporterId`.
 * Someone else's report is reported as "not found", so ids are not leaked.
 */
export const findOwnReportOrThrow = async (id: string, reporterId: string) => {
  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      reporterId: true,
      status: true,
      _count: { select: { moderationActions: true } },
    },
  });

  if (!report || report.reporterId !== reporterId) {
    throw new AppError(httpStatus.NOT_FOUND, "Report not found");
  }

  return report;
};

export const isReportTargetType = (value: unknown): value is ReportTargetType =>
  REPORT_TARGET_TYPES.includes(value as ReportTargetType);

/** Turns ?targetType=property|user|message into a where condition. */
export const buildReportTargetFilter = (
  targetType: ReportTargetType,
): ReportWhereInput => {
  switch (targetType) {
    case "property":
      return { propertyId: { not: null } };
    case "user":
      return { reportedUserId: { not: null } };
    case "message":
      return { messageId: { not: null } };
  }
};
