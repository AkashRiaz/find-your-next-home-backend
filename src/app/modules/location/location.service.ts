import { LocationType } from "../../../generated/prisma/enums";
import { LocationWhereInput } from "../../../generated/prisma/models/Location";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import {
  CreateLocationPayload,
  LocationQuery,
  UpdateLocationPayload,
  UpdateLocationStatusPayload,
} from "./location.interface";

const expectedParentTypes: Record<LocationType, LocationType[]> = {
  COUNTRY: [],
  DIVISION: [LocationType.COUNTRY],
  DISTRICT: [LocationType.DIVISION],
  UPAZILA: [LocationType.DISTRICT],
  UNION: [LocationType.UPAZILA],
  AREA: [LocationType.UPAZILA, LocationType.UNION],
};

const selectLocation = {
  id: true,
  name: true,
  slug: true,
  type: true,
  parentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const makeSlug = (name: string) =>
  name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");

const makeSlugOrThrow = (name: string) => {
  const slug = makeSlug(name);
  if (!slug || slug.length > 160) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Location name must contain letters or numbers and produce a slug of at most 160 characters",
    );
  }
  return slug;
};

const isUniqueConstraintError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "P2002";

const throwDuplicateLocation = (): never => {
  throw new AppError(
    httpStatus.CONFLICT,
    "A location with this name already exists under this parent",
  );
};

const assertParent = async (
  type: LocationType,
  parentId: string | null | undefined,
) => {
  const allowedParentTypes = expectedParentTypes[type];
  if (allowedParentTypes.length === 0) {
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
    select: { id: true, type: true, isActive: true },
  });
  if (!parent || !parent.isActive) {
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
  await assertPublicAncestry(parent.id);
};

const assertPublicAncestry = async (locationId: string) => {
  let currentId: string | null = locationId;
  const visited = new Set<string>();
  while (currentId) {
    if (visited.has(currentId)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Circular location hierarchy detected",
      );
    }
    visited.add(currentId);
    const current: {
      id: string;
      parentId: string | null;
      isActive: boolean;
    } | null = await prisma.location.findUnique({
      where: { id: currentId },
      select: { id: true, parentId: true, isActive: true },
    });
    if (!current || !current.isActive) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "Location is not publicly selectable",
      );
    }
    currentId = current.parentId;
  }
};

const getAllLocations = async (query: LocationQuery) => {
  if (query.parentId) await assertPublicAncestry(query.parentId);
  const andConditions: LocationWhereInput[] = [{ isActive: true }];
  const returnDefaultRoots =
    !query.parentId && !query.type && !query.searchTerm;

  if (query.parentId) andConditions.push({ parentId: query.parentId });
  if (query.type) andConditions.push({ type: query.type });
  if (query.searchTerm) {
    andConditions.push({
      name: { contains: query.searchTerm, mode: "insensitive" },
    });
  }
  if (returnDefaultRoots) {
    andConditions.push({ parentId: null }, { type: LocationType.COUNTRY });
  }

  const locations = await prisma.location.findMany({
    where: { AND: andConditions },
    orderBy: { name: "asc" },
    select: selectLocation,
  });

  // Load ancestor levels in batches so active descendants of inactive ancestors
  // never leak into public search or type-filtered results.
  const ancestors = new Map<string, string | null>();
  let frontier = [
    ...new Set(
      locations
        .map((location) => location.parentId)
        .filter((id): id is string => id !== null),
    ),
  ];
  for (let depth = 0; depth < 6 && frontier.length > 0; depth += 1) {
    const rows = await prisma.location.findMany({
      where: { id: { in: frontier }, isActive: true },
      select: { id: true, parentId: true },
    });
    for (const row of rows) ancestors.set(row.id, row.parentId);
    frontier = [
      ...new Set(
        rows
          .map((row) => row.parentId)
          .filter((id): id is string => id !== null && !ancestors.has(id)),
      ),
    ];
  }

  const hasActiveAncestors = (parentId: string | null) => {
    let currentId = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId) || !ancestors.has(currentId)) return false;
      visited.add(currentId);
      currentId = ancestors.get(currentId) ?? null;
    }
    return true;
  };

  return locations.filter((location) => hasActiveAncestors(location.parentId));
};

const getSingleLocation = async (id: string) => {
  const location = await prisma.location.findFirst({
    where: { id, isActive: true },
    select: {
      ...selectLocation,
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          isActive: true,
        },
      },
      children: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          isActive: true,
        },
      },
    },
  });
  if (!location) throw new AppError(httpStatus.NOT_FOUND, "Location not found");
  await assertPublicAncestry(id);
  return location;
};

const getChildLocations = async (id: string) => {
  await assertPublicAncestry(id);
  return prisma.location.findMany({
    where: { parentId: id, isActive: true },
    orderBy: { name: "asc" },
    select: selectLocation,
  });
};

const createLocation = async (payload: CreateLocationPayload) => {
  await assertParent(payload.type, payload.parentId);
  const slug = makeSlugOrThrow(payload.name);
  const duplicate = await prisma.location.findFirst({
    where: { slug, parentId: payload.parentId ?? null },
    select: { id: true },
  });
  if (duplicate) throwDuplicateLocation();

  try {
    return await prisma.location.create({
      data: {
        name: payload.name,
        slug,
        type: payload.type,
        parentId: payload.parentId ?? null,
        ...(payload.isActive === undefined
          ? {}
          : { isActive: payload.isActive }),
      },
      select: {
        ...selectLocation,
        parent: { select: { id: true, name: true, slug: true, type: true } },
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throwDuplicateLocation();
    throw error;
  }
};

const updateLocation = async (id: string, payload: UpdateLocationPayload) => {
  const current = await prisma.location.findUnique({
    where: { id },
    select: { id: true, parentId: true },
  });
  if (!current) throw new AppError(httpStatus.NOT_FOUND, "Location not found");

  const slug = makeSlugOrThrow(payload.name);
  const duplicate = await prisma.location.findFirst({
    where: { id: { not: id }, slug, parentId: current.parentId },
    select: { id: true },
  });
  if (duplicate) throwDuplicateLocation();

  try {
    return await prisma.location.update({
      where: { id },
      data: { name: payload.name, slug },
      select: selectLocation,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throwDuplicateLocation();
    throw error;
  }
};

const updateLocationStatus = async (
  id: string,
  payload: UpdateLocationStatusPayload,
) => {
  const current = await prisma.location.findUnique({
    where: { id },
    select: { id: true, parentId: true, isActive: true },
  });
  if (!current) throw new AppError(httpStatus.NOT_FOUND, "Location not found");

  if (payload.isActive) {
    if (current.parentId) await assertPublicAncestry(current.parentId);
  } else {
    let frontier = [id];
    const visited = new Set<string>([id]);
    let hasActiveDescendant = false;
    while (frontier.length > 0) {
      const descendants = await prisma.location.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true, isActive: true },
      });
      if (descendants.some((location) => location.isActive)) {
        hasActiveDescendant = true;
        break;
      }
      frontier = descendants
        .map((location) => location.id)
        .filter((descendantId) => !visited.has(descendantId));
      for (const descendantId of frontier) visited.add(descendantId);
    }
    if (hasActiveDescendant) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Deactivate active child locations before deactivating this location",
      );
    }
  }

  return prisma.location.update({
    where: { id },
    data: { isActive: payload.isActive },
    select: selectLocation,
  });
};

export const LocationService = {
  createLocation,
  getAllLocations,
  getSingleLocation,
  getChildLocations,
  updateLocation,
  updateLocationStatus,
};
