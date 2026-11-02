import httpStatus from "http-status";
import { LocationType } from "../../../generated/prisma/enums";
import type { LocationWhereInput } from "../../../generated/prisma/models/Location";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  locationSelectFields,
  locationSummarySelectFields,
} from "./location.constant";
import type {
  ICreateLocationPayload,
  ILocationQuery,
  IUpdateLocationPayload,
  IUpdateLocationStatusPayload,
} from "./location.interface";
import {
  ensureLocationAndAncestorsAreActive,
  ensureLocationSlugIsAvailable,
  ensureNoActiveDescendants,
  filterLocationsWithActiveAncestors,
  generateValidLocationSlug,
  validateParentLocation,
} from "./location.utils";

/**
 * Lists active locations.
 * With no filters, only top-level countries are returned.
 */
const getAllLocations = async (query: ILocationQuery) => {
  const { parentId, type, searchTerm } = query;

  if (parentId) await ensureLocationAndAncestorsAreActive(parentId);

  const filters: LocationWhereInput[] = [{ isActive: true }];

  if (parentId) filters.push({ parentId });
  if (type) filters.push({ type });
  if (searchTerm) {
    filters.push({ name: { contains: searchTerm, mode: "insensitive" } });
  }

  const hasNoFilters = !parentId && !type && !searchTerm;
  if (hasNoFilters) {
    filters.push({ parentId: null }, { type: LocationType.COUNTRY });
  }

  const locations = await prisma.location.findMany({
    where: { AND: filters },
    orderBy: { name: "asc" },
    select: locationSelectFields,
  });

  return filterLocationsWithActiveAncestors(locations);
};

/** Returns one active location with its parent and active children. */
const getSingleLocation = async (id: string) => {
  const location = await prisma.location.findFirst({
    where: { id, isActive: true },
    select: {
      ...locationSelectFields,
      parent: { select: locationSummarySelectFields },
      children: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: locationSummarySelectFields,
      },
    },
  });

  if (!location) {
    throw new AppError(httpStatus.NOT_FOUND, "Location not found");
  }

  await ensureLocationAndAncestorsAreActive(location.parentId, new Set([id]));

  return location;
};

/** Returns the active direct children of an active location. */
const getChildLocations = async (id: string) => {
  await ensureLocationAndAncestorsAreActive(id);

  return prisma.location.findMany({
    where: { parentId: id, isActive: true },
    orderBy: { name: "asc" },
    select: locationSelectFields,
  });
};

const createLocation = async (payload: ICreateLocationPayload) => {
  const parentId = payload.parentId ?? null;
  const slug = generateValidLocationSlug(payload.name);

  await validateParentLocation(payload.type, parentId);
  await ensureLocationSlugIsAvailable(slug, parentId);

  // isActive left undefined is skipped by Prisma, so the DB default applies.
  return prisma.location.create({
    data: {
      name: payload.name,
      slug,
      type: payload.type,
      parentId,
      isActive: payload.isActive,
    },
    select: {
      ...locationSelectFields,
      parent: { select: locationSummarySelectFields },
    },
  });
};

/** Renames a location; its slug is regenerated from the new name. */
const updateLocation = async (id: string, payload: IUpdateLocationPayload) => {
  const location = await prisma.location.findUnique({
    where: { id },
    select: { parentId: true },
  });

  if (!location) {
    throw new AppError(httpStatus.NOT_FOUND, "Location not found");
  }

  const slug = generateValidLocationSlug(payload.name);
  await ensureLocationSlugIsAvailable(slug, location.parentId, id);

  return prisma.location.update({
    where: { id },
    data: { name: payload.name, slug },
    select: locationSelectFields,
  });
};

/**
 * Activates or deactivates a location.
 * - Activating requires every ancestor to be active.
 * - Deactivating requires every descendant to be inactive.
 */
const updateLocationStatus = async (
  id: string,
  payload: IUpdateLocationStatusPayload,
) => {
  const location = await prisma.location.findUnique({
    where: { id },
    select: { id: true, parentId: true },
  });

  if (!location) {
    throw new AppError(httpStatus.NOT_FOUND, "Location not found");
  }

  if (payload.isActive) {
    await ensureLocationAndAncestorsAreActive(location.parentId);
  } else {
    await ensureNoActiveDescendants(id);
  }

  return prisma.location.update({
    where: { id },
    data: { isActive: payload.isActive },
    select: locationSelectFields,
  });
};

export const LocationService = {
  getAllLocations,
  getSingleLocation,
  getChildLocations,
  createLocation,
  updateLocation,
  updateLocationStatus,
};
