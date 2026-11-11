import httpStatus from "http-status";
import {
  NotificationType,
  ReportReason,
  ReportStatus,
} from "../../../generated/prisma/enums";
import type { ReportWhereInput } from "../../../generated/prisma/models/Report";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { isEnumValue, parseIdQuery } from "../property/property.utils";
import {
  CLOSED_REPORT_STATUSES,
  REPORT_STATUS_TRANSITIONS,
  reportAdminDetailSelectFields,
  reportAdminSelectFields,
  reportSelectFields,
} from "./report.constant";
import type {
  ICreateReportPayload,
  IUpdateReportStatusPayload,
} from "./report.interface";
import {
  buildReportTargetFilter,
  ensureNoOpenReportForTarget,
  ensureReportTargetIsValid,
  findOwnReportOrThrow,
  isReportTargetType,
} from "./report.utils";

// ---------------------------------------------------------------------------
// Reporter (logged-in user)
// ---------------------------------------------------------------------------

const createReport = async (
  reporterId: string,
  payload: ICreateReportPayload,
) => {
  await ensureReportTargetIsValid(payload, reporterId);
  await ensureNoOpenReportForTarget(reporterId, payload);

  // Fields left undefined are skipped by Prisma, so DB defaults apply.
  return prisma.report.create({
    data: {
      reporterId,
      propertyId: payload.propertyId,
      reportedUserId: payload.reportedUserId,
      messageId: payload.messageId,
      reason: payload.reason,
      description: payload.description,
    },
    select: reportSelectFields,
  });
};

/** The reports the user has submitted, newest first. */
const getMyReports = async (reporterId: string, query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["createdAt", "updatedAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: ReportWhereInput[] = [{ reporterId }];

  // Status filter
  if (isEnumValue(ReportStatus, query.status)) {
    andConditions.push({ status: query.status });
  }

  const reports = await prisma.report.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: reportSelectFields,
  });

  const total = await prisma.report.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: reports,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getMySingleReport = async (reporterId: string, id: string) => {
  await findOwnReportOrThrow(id, reporterId);

  return prisma.report.findUniqueOrThrow({
    where: { id },
    select: reportSelectFields,
  });
};

/**
 * Lets a user take back a report that no admin has picked up yet.
 * Once review has started, the report is part of the moderation record and stays.
 */
const withdrawReport = async (reporterId: string, id: string) => {
  const report = await findOwnReportOrThrow(id, reporterId);

  if (
    report.status !== ReportStatus.PENDING ||
    report._count.moderationActions > 0
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This report is already being reviewed and can no longer be withdrawn",
    );
  }

  return prisma.report.delete({
    where: { id },
    select: { id: true, createdAt: true },
  });
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Admin list: every report, oldest pending first by default, so nothing waits too long. */
const getAllReports = async (query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["createdAt", "updatedAt", "resolvedAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "desc" ? "desc" : "asc";

  const andConditions: ReportWhereInput[] = [];

  // Search
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          description: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          resolutionNote: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          reporter: {
            OR: [
              { name: { contains: query.searchTerm, mode: "insensitive" } },
              { email: { contains: query.searchTerm, mode: "insensitive" } },
            ],
          },
        },
        {
          reportedUser: {
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

  // Enum filters
  if (isEnumValue(ReportStatus, query.status)) {
    andConditions.push({ status: query.status });
  }

  if (isEnumValue(ReportReason, query.reason)) {
    andConditions.push({ reason: query.reason });
  }

  // Target type filter (property, user, message)
  if (isReportTargetType(query.targetType)) {
    andConditions.push(buildReportTargetFilter(query.targetType));
  }

  // Id filters, e.g. every report about one listing
  const reporterId = parseIdQuery(query.reporterId, "reporterId");
  if (reporterId) {
    andConditions.push({ reporterId });
  }

  const propertyId = parseIdQuery(query.propertyId, "propertyId");
  if (propertyId) {
    andConditions.push({ propertyId });
  }

  const reportedUserId = parseIdQuery(query.reportedUserId, "reportedUserId");
  if (reportedUserId) {
    andConditions.push({ reportedUserId });
  }

  const reports = await prisma.report.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: reportAdminSelectFields,
  });

  const total = await prisma.report.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: reports,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSingleReport = async (id: string) => {
  const report = await prisma.report.findUnique({
    where: { id },
    select: reportAdminDetailSelectFields,
  });

  if (!report) {
    throw new AppError(httpStatus.NOT_FOUND, "Report not found");
  }

  return report;
};

/**
 * Moves a report through review: PENDING -> REVIEWING -> RESOLVED / DISMISSED.
 * Closing a report stamps resolvedAt and tells the reporter the outcome.
 * Reopening clears resolvedAt but keeps the earlier note unless a new one is sent.
 */
const updateReportStatus = async (
  id: string,
  payload: IUpdateReportStatusPayload,
) => {
  const report = await prisma.report.findUnique({
    where: { id },
    select: { status: true, reporterId: true },
  });

  if (!report) {
    throw new AppError(httpStatus.NOT_FOUND, "Report not found");
  }

  const allowedStatuses = REPORT_STATUS_TRANSITIONS[report.status];

  if (!allowedStatuses.includes(payload.status)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `A ${report.status} report can only be moved to: ${allowedStatuses.join(", ")}`,
    );
  }

  const isClosing = CLOSED_REPORT_STATUSES.includes(payload.status);

  // Update and notify together, so the reporter is never told about a change that failed.
  return prisma.$transaction(async (tx) => {
    const updatedReport = await tx.report.update({
      where: { id },
      data: {
        status: payload.status,
        resolutionNote: payload.resolutionNote,
        resolvedAt: isClosing ? new Date() : null,
      },
      select: reportAdminSelectFields,
    });

    if (isClosing) {
      await tx.notification.create({
        data: {
          userId: report.reporterId,
          type: NotificationType.REPORT_UPDATE,
          title: "Your report has been reviewed",
          body:
            payload.status === ReportStatus.RESOLVED
              ? "Thanks for letting us know. We reviewed your report and took action."
              : "We reviewed your report and found no rule violation.",
          data: { reportId: id, status: payload.status },
        },
      });
    }

    return updatedReport;
  });
};

export const ReportService = {
  createReport,
  getMyReports,
  getMySingleReport,
  withdrawReport,
  getAllReports,
  getSingleReport,
  updateReportStatus,
};
