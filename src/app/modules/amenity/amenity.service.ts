import httpStatus from "http-status";
import type { AmenityWhereInput } from "../../../generated/prisma/models/Amenity";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  amenityAdminSelectFields,
  amenitySelectFields,
} from "./amenity.constant";
import type {
  ICreateAmenityPayload,
  IUpdateAmenityPayload,
  IUpdateAmenityStatusPayload,
} from "./amenity.interface";
import {
  ensureAmenityExists,
  ensureAmenitySlugIsAvailable,
  generateValidAmenitySlug,
} from "./amenity.utils";

/** Public list: active amenities only. */
const getAllAmenities = async (query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["name", "createdAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "name";

  const sortOrder = query.sortOrder === "desc" ? "desc" : "asc";

  const andConditions: AmenityWhereInput[] = [{ isActive: true }];

  // Search
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          name: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  const amenities = await prisma.amenity.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: amenitySelectFields,
  });

  const total = await prisma.amenity.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: amenities,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Admin list: active and inactive amenities, with usage counts. */
const getAllAmenitiesForAdmin = async (query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["name", "createdAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: AmenityWhereInput[] = [];

  // Search
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          name: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  // Status filter
  if (query.isActive === "true" || query.isActive === "false") {
    andConditions.push({
      isActive: query.isActive === "true",
    });
  }

  const amenities = await prisma.amenity.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: amenityAdminSelectFields,
  });

  const total = await prisma.amenity.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: amenities,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Public detail: only active amenities are visible. */
const getSingleAmenity = async (id: string) => {
  const amenity = await prisma.amenity.findFirst({
    where: { id, isActive: true },
    select: amenitySelectFields,
  });

  if (!amenity) {
    throw new AppError(httpStatus.NOT_FOUND, "Amenity not found");
  }

  return amenity;
};

const createAmenity = async (payload: ICreateAmenityPayload) => {
  const slug = generateValidAmenitySlug(payload.name);
  await ensureAmenitySlugIsAvailable(slug);

  // Fields left undefined are skipped by Prisma, so DB defaults apply.
  return prisma.amenity.create({
    data: {
      name: payload.name,
      slug,
      icon: payload.icon,
      description: payload.description,
      isActive: payload.isActive,
    },
    select: amenitySelectFields,
  });
};

/**
 * Updates only the fields that were sent.
 * Changing the name also regenerates the slug.
 */
const updateAmenity = async (id: string, payload: IUpdateAmenityPayload) => {
  await ensureAmenityExists(id);

  const slug = payload.name ? generateValidAmenitySlug(payload.name) : undefined;
  if (slug) await ensureAmenitySlugIsAvailable(slug, id);

  // Fields left undefined are skipped by Prisma; null clears a field.
  return prisma.amenity.update({
    where: { id },
    data: {
      name: payload.name,
      slug,
      icon: payload.icon,
      description: payload.description,
    },
    select: amenitySelectFields,
  });
};

const updateAmenityStatus = async (
  id: string,
  payload: IUpdateAmenityStatusPayload,
) => {
  await ensureAmenityExists(id);

  return prisma.amenity.update({
    where: { id },
    data: { isActive: payload.isActive },
    select: amenitySelectFields,
  });
};

/**
 * Permanently deletes an amenity that no property uses.
 * Amenities in use must be deactivated instead, to keep listings intact.
 */
const deleteAmenity = async (id: string) => {
  const amenity = await prisma.amenity.findUnique({
    where: { id },
    select: { _count: { select: { properties: true } } },
  });

  if (!amenity) {
    throw new AppError(httpStatus.NOT_FOUND, "Amenity not found");
  }

  if (amenity._count.properties > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This amenity is used by one or more properties. Deactivate it instead of deleting",
    );
  }

  return prisma.amenity.delete({
    where: { id },
    select: amenitySelectFields,
  });
};

export const AmenityService = {
  getAllAmenities,
  getAllAmenitiesForAdmin,
  getSingleAmenity,
  createAmenity,
  updateAmenity,
  updateAmenityStatus,
  deleteAmenity,
};
