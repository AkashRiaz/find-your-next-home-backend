import { z } from "zod";
import { LocationType } from "../../../generated/prisma/enums";
import { LOCATION_NAME_MAX_LENGTH } from "./location.constant";

const locationIdSchema = z.uuid({
  message: "Location id must be a valid UUID",
});

const locationNameSchema = z
  .string({ message: "Location name is required" })
  .trim()
  .min(1, { message: "Location name cannot be empty" })
  .max(LOCATION_NAME_MAX_LENGTH, {
    message: `Location name must be at most ${LOCATION_NAME_MAX_LENGTH} characters`,
  });

const locationTypeSchema = z.enum(LocationType, {
  message: `Location type must be one of: ${Object.values(LocationType).join(", ")}`,
});

export const locationIdParamsSchema = z.object({
  id: locationIdSchema,
});

export const getLocationsQuerySchema = z.object({
  parentId: locationIdSchema.optional(),
  type: locationTypeSchema.optional(),
  searchTerm: z.string().trim().min(1).max(LOCATION_NAME_MAX_LENGTH).optional(),
});

export const createLocationBodySchema = z
  .object({
    name: locationNameSchema,
    type: locationTypeSchema,
    parentId: locationIdSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateLocationBodySchema = z
  .object({
    name: locationNameSchema,
  })
  .strict();

export const updateLocationStatusBodySchema = z
  .object({
    isActive: z.boolean({ message: "isActive must be true or false" }),
  })
  .strict();
