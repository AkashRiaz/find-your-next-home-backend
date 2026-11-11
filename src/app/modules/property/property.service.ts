import httpStatus from "http-status";
import { ListingStatus } from "../../../generated/prisma/enums";
import type { PropertyWhereInput } from "../../../generated/prisma/models/Property";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  LIVE_STATUSES,
  OWNER_STATUS_TRANSITIONS,
  propertyAdminCardSelectFields,
  propertyCardSelectFields,
  propertyDetailIncludeFields,
} from "./property.constant";
import type {
  ICreatePropertyPayload,
  IUpdatePropertyPayload,
  IUpdatePropertyStatusPayload,
} from "./property.interface";
import {
  buildPropertyFilters,
  ensurePropertyIsReadyToPublish,
  findOwnedPropertyOrThrow,
  getStatusTimestamps,
  isEnumValue,
  parseIdQuery,
  validatePropertyCounts,
  validatePropertyReferences,
  withoutUndefined,
} from "./property.utils";

/** Public list: published listings with an active category. */
const getAllProperties = async (query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "publishedAt",
    "monthlyRent",
    "areaSqFt",
    "createdAt",
  ];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "publishedAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: PropertyWhereInput[] = [
    { status: ListingStatus.PUBLISHED },
    { category: { isActive: true } },
    ...(await buildPropertyFilters(query)),
  ];

  const properties = await prisma.property.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: propertyCardSelectFields,
  });

  const total = await prisma.property.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: properties,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Owner's own listings in every status. */
const getMyProperties = async (ownerId: string, query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "updatedAt",
    "createdAt",
    "publishedAt",
    "monthlyRent",
  ];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "updatedAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: PropertyWhereInput[] = [
    { ownerId },
    ...(await buildPropertyFilters(query)),
  ];

  // Status filter
  if (isEnumValue(ListingStatus, query.status)) {
    andConditions.push({ status: query.status });
  }

  const properties = await prisma.property.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: propertyCardSelectFields,
  });

  const total = await prisma.property.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: properties,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Admin list: every listing, with owner details. */
const getAllPropertiesForAdmin = async (query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "publishedAt",
    "monthlyRent",
  ];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: PropertyWhereInput[] = await buildPropertyFilters(query);

  // Status filter
  if (isEnumValue(ListingStatus, query.status)) {
    andConditions.push({ status: query.status });
  }

  // Owner filter
  const ownerId = parseIdQuery(query.ownerId, "ownerId");
  if (ownerId) {
    andConditions.push({ ownerId });
  }

  const properties = await prisma.property.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: propertyAdminCardSelectFields,
  });

  const total = await prisma.property.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: properties,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Public detail: published and rented listings are visible. */
const getSingleProperty = async (id: string) => {
  const property = await prisma.property.findFirst({
    where: { id, status: { in: [...LIVE_STATUSES] } },
    include: propertyDetailIncludeFields,
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  return property;
};

/** Owner detail: any status, including drafts. */
const getMySingleProperty = async (id: string, ownerId: string) => {
  const property = await prisma.property.findFirst({
    where: { id, ownerId },
    include: propertyDetailIncludeFields,
  });

  if (!property) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  return property;
};

/** Creates a new listing as a DRAFT. */
const createProperty = async (
  ownerId: string,
  payload: ICreatePropertyPayload,
) => {
  const { amenityIds, ...propertyFields } = payload;

  await validatePropertyReferences(payload);
  validatePropertyCounts(propertyFields);

  return prisma.property.create({
    data: {
      ...propertyFields,
      ownerId,
      amenities: amenityIds
        ? { create: amenityIds.map((amenityId) => ({ amenityId })) }
        : undefined,
    },
    include: propertyDetailIncludeFields,
  });
};

/**
 * Updates only the fields that were sent.
 * Sending `amenityIds` replaces the whole amenity list.
 * A live listing (published or rented) must stay complete after the update.
 */
const updateProperty = async (
  id: string,
  ownerId: string,
  payload: IUpdatePropertyPayload,
) => {
  const property = await findOwnedPropertyOrThrow(id, ownerId);

  if (property.status === ListingStatus.SUSPENDED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This listing is suspended and cannot be edited",
    );
  }

  const { amenityIds, ...propertyFields } = payload;

  await validatePropertyReferences(payload);

  const updatedValues = { ...property, ...withoutUndefined(propertyFields) };
  validatePropertyCounts(updatedValues);

  if (LIVE_STATUSES.includes(property.status)) {
    await ensurePropertyIsReadyToPublish(updatedValues);
  }

  return prisma.property.update({
    where: { id },
    data: {
      ...propertyFields,
      amenities: amenityIds
        ? {
            deleteMany: {},
            create: amenityIds.map((amenityId) => ({ amenityId })),
          }
        : undefined,
    },
    include: propertyDetailIncludeFields,
  });
};

/**
 * Moves a listing through its lifecycle, e.g. DRAFT -> PUBLISHED -> RENTED.
 * Allowed moves are listed in OWNER_STATUS_TRANSITIONS.
 */
const updatePropertyStatus = async (
  id: string,
  ownerId: string,
  payload: IUpdatePropertyStatusPayload,
) => {
  const property = await findOwnedPropertyOrThrow(id, ownerId);
  const newStatus = payload.status;

  if (property.status === ListingStatus.SUSPENDED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This listing is suspended. Only an admin can restore it",
    );
  }

  if (property.status === newStatus) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This listing is already ${newStatus}`,
    );
  }

  if (!OWNER_STATUS_TRANSITIONS[property.status].includes(newStatus)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `A ${property.status} listing cannot be changed to ${newStatus}`,
    );
  }

  if (newStatus === ListingStatus.PUBLISHED) {
    await ensurePropertyIsReadyToPublish(property);
  }

  return prisma.property.update({
    where: { id },
    data: { status: newStatus, ...getStatusTimestamps(newStatus) },
    select: propertyCardSelectFields,
  });
};

/**
 * Permanently deletes a draft.
 * Listings that have been published should be archived instead.
 */
const deleteProperty = async (id: string, ownerId: string) => {
  const property = await findOwnedPropertyOrThrow(id, ownerId);

  if (property.status !== ListingStatus.DRAFT) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Only draft listings can be deleted. Archive this listing instead",
    );
  }

  return prisma.property.delete({
    where: { id },
    select: propertyCardSelectFields,
  });
};

export const PropertyService = {
  getAllProperties,
  getMyProperties,
  getAllPropertiesForAdmin,
  getSingleProperty,
  getMySingleProperty,
  createProperty,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
};
