import { z } from "zod";
import { ReportReason, ReportStatus } from "../../../generated/prisma/enums";
import {
  CLOSED_REPORT_STATUSES,
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_RESOLUTION_NOTE_MAX_LENGTH,
} from "./report.constant";

const uuidSchema = (field: string) =>
  z.uuid({ message: `${field} must be a valid UUID` });

/**
 * Optional text field. An empty string or null clears the value,
 * so `{ "description": "" }` and `{ "description": null }` are the same.
 */
const optionalTextSchema = (field: string, maxLength: number) =>
  z
    .string({ message: `${field} must be a string` })
    .trim()
    .max(maxLength, {
      message: `${field} must be at most ${maxLength} characters`,
    })
    .transform((value) => value || null)
    .nullable()
    .optional();

export const reportIdParamsSchema = z.object({
  id: uuidSchema("Report id"),
});

export const createReportBodySchema = z
  .object({
    propertyId: uuidSchema("Property id").optional(),
    reportedUserId: uuidSchema("Reported user id").optional(),
    messageId: uuidSchema("Message id").optional(),
    reason: z.enum(ReportReason, {
      message: `Reason must be one of: ${Object.values(ReportReason).join(", ")}`,
    }),
    description: optionalTextSchema(
      "Description",
      REPORT_DESCRIPTION_MAX_LENGTH,
    ),
  })
  .strict()
  .refine(
    (body) =>
      [body.propertyId, body.reportedUserId, body.messageId].filter(Boolean)
        .length === 1,
    {
      message:
        "Report exactly one thing: provide one of propertyId, reportedUserId or messageId",
    },
  )
  // "Other" tells the admin nothing on its own, so ask the user to explain.
  .refine((body) => body.reason !== ReportReason.OTHER || body.description, {
    message: "Please describe the problem when the reason is OTHER",
    path: ["description"],
  });

export const updateReportStatusBodySchema = z
  .object({
    status: z.enum(ReportStatus, {
      message: `Status must be one of: ${Object.values(ReportStatus).join(", ")}`,
    }),
    resolutionNote: optionalTextSchema(
      "Resolution note",
      REPORT_RESOLUTION_NOTE_MAX_LENGTH,
    ),
  })
  .strict()
  // Closing a report needs a written reason, for the audit trail.
  .refine(
    (body) =>
      !CLOSED_REPORT_STATUSES.includes(body.status) || body.resolutionNote,
    {
      message: "A resolution note is required to resolve or dismiss a report",
      path: ["resolutionNote"],
    },
  );
