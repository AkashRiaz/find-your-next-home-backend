import { LocationType } from "../../../generated/prisma/enums";
import { z } from "zod";

export const getLocationsQuerySchema = z.object({
  parentId: z.uuid().optional(),
  type: z.enum(LocationType).optional(),
  searchTerm: z.string().trim().min(1).max(150).optional(),
});

export const locationIdParamsSchema = z.object({ id: z.uuid() });

export const createLocationBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  type: z.enum(LocationType),
  parentId: z.uuid().nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();

export const updateLocationBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
}).strict();

export const updateLocationStatusBodySchema = z.object({
  isActive: z.boolean(),
}).strict();
