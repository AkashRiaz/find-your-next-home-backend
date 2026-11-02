import { z } from "zod";
import {
  AMENITY_DESCRIPTION_MAX_LENGTH,
  AMENITY_ICON_MAX_LENGTH,
  AMENITY_NAME_MAX_LENGTH,
} from "./amenity.constant";

const amenityIdSchema = z.uuid({
  message: "Amenity id must be a valid UUID",
});

const amenityNameSchema = z
  .string({ message: "Amenity name is required" })
  .trim()
  .min(1, { message: "Amenity name cannot be empty" })
  .max(AMENITY_NAME_MAX_LENGTH, {
    message: `Amenity name must be at most ${AMENITY_NAME_MAX_LENGTH} characters`,
  });

/**
 * Optional text field. An empty string or null clears the value,
 * so `{ "icon": "" }` and `{ "icon": null }` both remove the icon.
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

const iconSchema = optionalTextSchema("Icon", AMENITY_ICON_MAX_LENGTH);
const descriptionSchema = optionalTextSchema(
  "Description",
  AMENITY_DESCRIPTION_MAX_LENGTH,
);

export const amenityIdParamsSchema = z.object({
  id: amenityIdSchema,
});

export const createAmenityBodySchema = z
  .object({
    name: amenityNameSchema,
    icon: iconSchema,
    description: descriptionSchema,
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateAmenityBodySchema = z
  .object({
    name: amenityNameSchema.optional(),
    icon: iconSchema,
    description: descriptionSchema,
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update: name, icon or description",
  });

export const updateAmenityStatusBodySchema = z
  .object({
    isActive: z.boolean({ message: "isActive must be true or false" }),
  })
  .strict();
