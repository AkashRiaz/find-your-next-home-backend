import { z } from "zod";
import { PropertyType } from "../../../generated/prisma/enums";
import {
  PROPERTY_CATEGORY_DESCRIPTION_MAX_LENGTH,
  PROPERTY_CATEGORY_ICON_MAX_LENGTH,
  PROPERTY_CATEGORY_NAME_MAX_LENGTH,
} from "./propertyCategory.constant";

const propertyCategoryIdSchema = z.uuid({
  message: "Property category id must be a valid UUID",
});

const propertyCategoryNameSchema = z
  .string({ message: "Category name is required" })
  .trim()
  .min(1, { message: "Category name cannot be empty" })
  .max(PROPERTY_CATEGORY_NAME_MAX_LENGTH, {
    message: `Category name must be at most ${PROPERTY_CATEGORY_NAME_MAX_LENGTH} characters`,
  });

const propertyTypeSchema = z.enum(PropertyType, {
  message: `Property type must be one of: ${Object.values(PropertyType).join(", ")}`,
});

/** Display position; lower numbers are shown first. */
const sortOrderSchema = z
  .int32({ message: "sortOrder must be a whole number" })
  .nonnegative({ message: "sortOrder cannot be negative" });

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

const iconSchema = optionalTextSchema(
  "Icon",
  PROPERTY_CATEGORY_ICON_MAX_LENGTH,
);
const descriptionSchema = optionalTextSchema(
  "Description",
  PROPERTY_CATEGORY_DESCRIPTION_MAX_LENGTH,
);

export const propertyCategoryIdParamsSchema = z.object({
  id: propertyCategoryIdSchema,
});

export const createPropertyCategoryBodySchema = z
  .object({
    name: propertyCategoryNameSchema,
    type: propertyTypeSchema,
    description: descriptionSchema,
    icon: iconSchema,
    sortOrder: sortOrderSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updatePropertyCategoryBodySchema = z
  .object({
    name: propertyCategoryNameSchema.optional(),
    type: propertyTypeSchema.optional(),
    description: descriptionSchema,
    icon: iconSchema,
    sortOrder: sortOrderSchema.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message:
      "Provide at least one field to update: name, type, description, icon or sortOrder",
  });

export const updatePropertyCategoryStatusBodySchema = z
  .object({
    isActive: z.boolean({ message: "isActive must be true or false" }),
  })
  .strict();
