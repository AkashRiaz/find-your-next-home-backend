import httpStatus from "http-status";
import type { LocationType } from "../../../generated/prisma/enums";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { toSlug } from "../../utils/slug";
import {
  ALLOWED_PARENT_TYPES,
  LOCATION_SLUG_MAX_LENGTH,
} from "./location.constant";
import type { ILocationTreeNode } from "./location.interface";

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

export const generateValidLocationSlug = (name: string): string => {
  const slug = toSlug(name);

  if (!slug || slug.length > LOCATION_SLUG_MAX_LENGTH) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Location name must contain letters or numbers and produce a slug of at most ${LOCATION_SLUG_MAX_LENGTH} characters`,
    );
  }

  return slug;
};

/**
 * Throws if a sibling (same parent) already uses this slug.
 * Pass `currentLocationId` when renaming, so the location does not clash with itself.
 */
export const ensureLocationSlugIsAvailable = async (
  slug: string,
  parentId: string | null,
  currentLocationId?: string,
): Promise<void> => {
  const existingLocation = await prisma.location.findFirst({
    where: { slug, parentId },
    select: { id: true },
  });

  if (existingLocation && existingLocation.id !== currentLocationId) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A location with this name already exists under this parent",
    );
  }
};

// ---------------------------------------------------------------------------
// Hierarchy checks
// ---------------------------------------------------------------------------

/** Collects unique, non-null parent ids that have not been seen yet. */
const getUnseenParentIds = (
  nodes: ILocationTreeNode[],
  seenIds: Set<string>,
): string[] => {
  const parentIds = nodes
    .map((node) => node.parentId)
    .filter((id): id is string => id !== null && !seenIds.has(id));

  return [...new Set(parentIds)];
};

/**
 * Walks up from `locationId` to the root and throws if any location
 * on the way is missing, inactive, or part of a cycle.
 */
export const ensureLocationAndAncestorsAreActive = async (
  locationId: string | null,
  visitedIds = new Set<string>(),
): Promise<void> => {
  let currentId = locationId;

  while (currentId) {
    if (visitedIds.has(currentId)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Circular location hierarchy detected",
      );
    }
    visitedIds.add(currentId);

    const location: (ILocationTreeNode & { isActive: boolean }) | null =
      await prisma.location.findUnique({
        where: { id: currentId },
        select: { id: true, parentId: true, isActive: true },
      });

    if (!location?.isActive) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Location is not publicly selectable",
      );
    }

    currentId = location.parentId;
  }
};

/**
 * Checks that a location of `type` may be placed under `parentId`:
 * - a COUNTRY must not have a parent
 * - every other type needs an active parent of an allowed type
 *   whose own ancestors are all active
 */
export const validateParentLocation = async (
  type: LocationType,
  parentId: string | null | undefined,
): Promise<void> => {
  const allowedParentTypes = ALLOWED_PARENT_TYPES[type];
  const isRootType = allowedParentTypes.length === 0;

  if (isRootType) {
    if (parentId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "A country cannot have a parent location",
      );
    }
    return;
  }

  if (!parentId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `${type} requires a parent location`,
    );
  }

  const parent = await prisma.location.findUnique({
    where: { id: parentId },
    select: { id: true, type: true, isActive: true, parentId: true },
  });

  if (!parent?.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Active parent location not found",
    );
  }

  if (!allowedParentTypes.includes(parent.type)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `${type} cannot be created under a ${parent.type.toLowerCase()}`,
    );
  }

  await ensureLocationAndAncestorsAreActive(
    parent.parentId,
    new Set([parent.id]),
  );
};

/**
 * Removes locations that sit below an inactive (or missing) ancestor,
 * so they never leak into public search or type-filtered results.
 *
 * Ancestors are loaded one level per query (breadth-first) instead of
 * one query per location.
 */
export const filterLocationsWithActiveAncestors = async <
  T extends ILocationTreeNode,
>(
  locations: T[],
): Promise<T[]> => {
  // Every location known to be active, mapped to its parent id.
  const activeParentIdById = new Map<string, string | null>(
    locations.map((location) => [location.id, location.parentId]),
  );
  const checkedIds = new Set(activeParentIdById.keys());
  let idsToLoad = getUnseenParentIds(locations, checkedIds);

  while (idsToLoad.length > 0) {
    for (const id of idsToLoad) checkedIds.add(id);

    const activeAncestors = await prisma.location.findMany({
      where: { id: { in: idsToLoad }, isActive: true },
      select: { id: true, parentId: true },
    });

    for (const ancestor of activeAncestors) {
      activeParentIdById.set(ancestor.id, ancestor.parentId);
    }

    idsToLoad = getUnseenParentIds(activeAncestors, checkedIds);
  }

  const hasOnlyActiveAncestors = (parentId: string | null): boolean => {
    const visitedIds = new Set<string>();
    let currentId = parentId;

    while (currentId) {
      const isCycle = visitedIds.has(currentId);
      const isInactiveOrMissing = !activeParentIdById.has(currentId);
      if (isCycle || isInactiveOrMissing) return false;

      visitedIds.add(currentId);
      currentId = activeParentIdById.get(currentId) ?? null;
    }

    return true;
  };

  return locations.filter((location) =>
    hasOnlyActiveAncestors(location.parentId),
  );
};

/**
 * Throws if any location below `locationId` (at any depth) is still active.
 * Children must be deactivated before their parent.
 */
export const ensureNoActiveDescendants = async (
  locationId: string,
): Promise<void> => {
  const visitedIds = new Set<string>([locationId]);
  let idsToCheck = [locationId];

  while (idsToCheck.length > 0) {
    const children = await prisma.location.findMany({
      where: { parentId: { in: idsToCheck } },
      select: { id: true, isActive: true },
    });

    if (children.some((child) => child.isActive)) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Deactivate active child locations before deactivating this location",
      );
    }

    idsToCheck = children
      .map((child) => child.id)
      .filter((id) => !visitedIds.has(id));

    for (const id of idsToCheck) visitedIds.add(id);
  }
};

/**
 * Returns `locationId` plus the ids of all its active descendants,
 * so searching "Magura" also finds properties in its upazilas and areas.
 */
export const getActiveLocationAndDescendantIds = async (
  locationId: string,
): Promise<string[]> => {
  const collectedIds = new Set<string>([locationId]);
  let parentIds = [locationId];

  while (parentIds.length > 0) {
    const children = await prisma.location.findMany({
      where: { parentId: { in: parentIds }, isActive: true },
      select: { id: true },
    });

    parentIds = children
      .map((child) => child.id)
      .filter((id) => !collectedIds.has(id));

    for (const id of parentIds) collectedIds.add(id);
  }

  return [...collectedIds];
};
