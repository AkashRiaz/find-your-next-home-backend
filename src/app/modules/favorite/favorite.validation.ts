import { z } from "zod";

const propertyIdSchema = z.uuid({
  message: "Property id must be a valid UUID",
});

export const favoritePropertyIdParamsSchema = z.object({
  propertyId: propertyIdSchema,
});

export const addFavoriteBodySchema = z
  .object({
    propertyId: propertyIdSchema,
  })
  .strict();
