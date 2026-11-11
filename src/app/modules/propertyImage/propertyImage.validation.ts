import { z } from "zod";
import {
  PROPERTY_IMAGE_ALT_TEXT_MAX_LENGTH,
  PROPERTY_IMAGE_MAX_COUNT,
} from "./propertyImage.constant";

const propertyIdSchema = z.uuid({ message: "Property id must be a valid UUID" });
const imageIdSchema = z.uuid({ message: "Image id must be a valid UUID" });

export const propertyIdParamsSchema = z.object({
  propertyId: propertyIdSchema,
});

export const propertyImageParamsSchema = z.object({
  propertyId: propertyIdSchema,
  imageId: imageIdSchema,
});

export const updatePropertyImageBodySchema = z
  .object({
    // Describes the photo for screen readers. "" or null removes it.
    altText: z
      .string({ message: "altText must be a string" })
      .trim()
      .max(PROPERTY_IMAGE_ALT_TEXT_MAX_LENGTH, {
        message: `altText must be at most ${PROPERTY_IMAGE_ALT_TEXT_MAX_LENGTH} characters`,
      })
      .transform((value) => value || null)
      .nullable(),
  })
  .strict();

export const reorderPropertyImagesBodySchema = z
  .object({
    imageIds: z
      .array(imageIdSchema, { message: "imageIds must be a list of image ids" })
      .min(1, { message: "imageIds cannot be empty" })
      .max(PROPERTY_IMAGE_MAX_COUNT)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "imageIds cannot contain the same image twice",
      }),
  })
  .strict();
