import type {
  ReportReason,
  ReportStatus,
} from "../../../generated/prisma/enums";

/** Exactly one of propertyId, reportedUserId or messageId is set. */
export interface ICreateReportPayload {
  propertyId?: string;
  reportedUserId?: string;
  messageId?: string;
  reason: ReportReason;
  description?: string | null;
}

export interface IUpdateReportStatusPayload {
  status: ReportStatus;
  resolutionNote?: string | null;
}
