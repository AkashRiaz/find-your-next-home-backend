import { ReportStatus } from "../../../generated/prisma/enums";
import type { ReportSelect } from "../../../generated/prisma/models/Report";

// description and resolutionNote are Text columns in prisma/schema/report.prisma,
// so these limits are app rules that keep reports readable, not DB sizes.
export const REPORT_DESCRIPTION_MAX_LENGTH = 1000;
export const REPORT_RESOLUTION_NOTE_MAX_LENGTH = 2000;

/** Reports an admin is still working on. A user can't open a second one for the same target. */
export const OPEN_REPORT_STATUSES: readonly ReportStatus[] = [
  ReportStatus.PENDING,
  ReportStatus.REVIEWING,
];

/** Statuses that close a report. They stamp resolvedAt and need a note. */
export const CLOSED_REPORT_STATUSES: readonly ReportStatus[] = [
  ReportStatus.RESOLVED,
  ReportStatus.DISMISSED,
];

/**
 * Which status an admin can move a report to from its current status.
 * A closed report can be reopened for review if new evidence turns up.
 */
export const REPORT_STATUS_TRANSITIONS: Record<
  ReportStatus,
  readonly ReportStatus[]
> = {
  PENDING: [ReportStatus.REVIEWING, ReportStatus.RESOLVED, ReportStatus.DISMISSED],
  REVIEWING: [ReportStatus.RESOLVED, ReportStatus.DISMISSED],
  RESOLVED: [ReportStatus.REVIEWING],
  DISMISSED: [ReportStatus.REVIEWING],
};

/** Target types accepted by the ?targetType= filter. */
export const REPORT_TARGET_TYPES = ["property", "user", "message"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

/**
 * Fields the reporter sees for their own reports.
 * The admin's resolutionNote is internal, so the reporter only sees the outcome.
 */
export const reportSelectFields = {
  id: true,
  reason: true,
  description: true,
  status: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  property: { select: { id: true, title: true } },
  reportedUser: { select: { id: true, name: true, avatarUrl: true } },
  message: { select: { id: true, body: true, createdAt: true } },
} as const satisfies ReportSelect;

/** Admin list: who reported, who owns the target, and moderation history size. */
export const reportAdminSelectFields = {
  ...reportSelectFields,
  resolutionNote: true,
  reporter: { select: { id: true, name: true, email: true } },
  property: {
    select: {
      id: true,
      title: true,
      status: true,
      owner: { select: { id: true, name: true, email: true } },
    },
  },
  reportedUser: {
    select: { id: true, name: true, email: true, status: true },
  },
  message: {
    select: {
      id: true,
      body: true,
      createdAt: true,
      deletedAt: true,
      sender: { select: { id: true, name: true, email: true } },
    },
  },
  _count: { select: { moderationActions: true } },
} as const satisfies ReportSelect;

/** Admin detail also lists the moderation actions taken on this report. */
export const reportAdminDetailSelectFields = {
  ...reportAdminSelectFields,
  moderationActions: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      reason: true,
      createdAt: true,
      admin: { select: { id: true, name: true } },
    },
  },
} as const satisfies ReportSelect;
