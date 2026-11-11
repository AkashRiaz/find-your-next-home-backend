import { z } from "zod";
import {
  NOTIFICATION_BODY_MAX_LENGTH,
  NOTIFICATION_TITLE_MAX_LENGTH,
} from "./notification.constant";

const uuidSchema = (field: string) =>
  z.uuid({ message: `${field} must be a valid UUID` });

/**
 * Optional text field. An empty string or null clears the value,
 * so `{ "body": "" }` and `{ "body": null }` are the same.
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

export const notificationIdParamsSchema = z.object({
  id: uuidSchema("Notification id"),
});

export const sendSystemNotificationBodySchema = z
  .object({
    userId: uuidSchema("User id"),
    title: z
      .string({ message: "Title is required" })
      .trim()
      .min(1, { message: "Title cannot be empty" })
      .max(NOTIFICATION_TITLE_MAX_LENGTH, {
        message: `Title must be at most ${NOTIFICATION_TITLE_MAX_LENGTH} characters`,
      }),
    body: optionalTextSchema("Body", NOTIFICATION_BODY_MAX_LENGTH),
    // Extra info the app can use, e.g. { "link": "/properties/123" }
    data: z
      .record(z.string(), z.json(), {
        message: "data must be a JSON object",
      })
      .optional(),
  })
  .strict();
