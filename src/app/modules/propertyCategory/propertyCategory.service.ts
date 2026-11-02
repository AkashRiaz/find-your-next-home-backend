import httpStatus from "http-status";
import type { PropertyCategoryWhereInput } from "../../../generated/prisma/models/PropertyCategory";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  propertyCategoryAdminSelectFields,
  propertyCategorySelectFields,
} from "./propertyCategory.constant";
import type {
  ICreatePropertyCategoryPayload,
  IUpdatePropertyCategoryPayload,
  IUpdatePropertyCategoryStatusPayload,
} from "./propertyCategory.interface";
import {
  ensurePropertyCategoryExists,
  ensurePropertyCategorySlugIsAvailable,
  generateValidPropertyCategorySlug,
  isPropertyType,
} from "./propertyCategory.utils";

/** Public list: active categories only, in display order by default. */
const getAllPropertyCategories = async (query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["sortOrder", "name", "createdAt", "updatedAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "sortOrder";

  const sortOrder = query.sortOrder === "desc" ? "desc" : "asc";

  const andConditions: PropertyCategoryWhereInput[] = [{ isActive: true }];

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

  // Property type filter
  if (isPropertyType(query.type)) {
    andConditions.push({
      type: query.type,
    });
  }

  const categories = await prisma.propertyCategory.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    // Name breaks ties, since many categories share the same sortOrder.
    orderBy: [{ [sortBy]: sortOrder }, { name: "asc" }],

    select: propertyCategorySelectFields,
  });

  const total = await prisma.propertyCategory.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: categories,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Admin list: active and inactive categories, with usage counts. */
const getAllPropertyCategoriesForAdmin = async (query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["sortOrder", "name", "createdAt", "updatedAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: PropertyCategoryWhereInput[] = [];

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

  // Property type filter
  if (isPropertyType(query.type)) {
    andConditions.push({
      type: query.type,
    });
  }

  // Status filter
  if (query.isActive === "true" || query.isActive === "false") {
    andConditions.push({
      isActive: query.isActive === "true",
    });
  }

  const categories = await prisma.propertyCategory.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: [{ [sortBy]: sortOrder }, { name: "asc" }],

    select: propertyCategoryAdminSelectFields,
  });

  const total = await prisma.propertyCategory.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: categories,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Public detail: only active categories are visible. */
const getSinglePropertyCategory = async (id: string) => {
  const category = await prisma.propertyCategory.findFirst({
    where: { id, isActive: true },
    select: propertyCategorySelectFields,
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Property category not found");
  }

  return category;
};

const createPropertyCategory = async (
  payload: ICreatePropertyCategoryPayload,
) => {
  const slug = generateValidPropertyCategorySlug(payload.name);
  await ensurePropertyCategorySlugIsAvailable(slug);

  // Fields left undefined are skipped by Prisma, so DB defaults apply.
  return prisma.propertyCategory.create({
    data: {
      name: payload.name,
      slug,
      type: payload.type,
      description: payload.description,
      icon: payload.icon,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
    },
    select: propertyCategorySelectFields,
  });
};

/**
 * Updates only the fields that were sent.
 * Changing the name also regenerates the slug.
 */
const updatePropertyCategory = async (
  id: string,
  payload: IUpdatePropertyCategoryPayload,
) => {
  await ensurePropertyCategoryExists(id);

  const slug = payload.name
    ? generateValidPropertyCategorySlug(payload.name)
    : undefined;
  if (slug) await ensurePropertyCategorySlugIsAvailable(slug, id);

  // Fields left undefined are skipped by Prisma; null clears a field.
  return prisma.propertyCategory.update({
    where: { id },
    data: {
      name: payload.name,
      slug,
      type: payload.type,
      description: payload.description,
      icon: payload.icon,
      sortOrder: payload.sortOrder,
    },
    select: propertyCategorySelectFields,
  });
};

const updatePropertyCategoryStatus = async (
  id: string,
  payload: IUpdatePropertyCategoryStatusPayload,
) => {
  await ensurePropertyCategoryExists(id);

  return prisma.propertyCategory.update({
    where: { id },
    data: { isActive: payload.isActive },
    select: propertyCategorySelectFields,
  });
};

/**
 * Permanently deletes a category that no property uses.
 * Categories in use must be deactivated instead, to keep listings intact.
 */
const deletePropertyCategory = async (id: string) => {
  const category = await prisma.propertyCategory.findUnique({
    where: { id },
    select: { _count: { select: { properties: true } } },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Property category not found");
  }

  if (category._count.properties > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This category is used by one or more properties. Deactivate it instead of deleting",
    );
  }

  return prisma.propertyCategory.delete({
    where: { id },
    select: propertyCategorySelectFields,
  });
};

export const PropertyCategoryService = {
  getAllPropertyCategories,
  getAllPropertyCategoriesForAdmin,
  getSinglePropertyCategory,
  createPropertyCategory,
  updatePropertyCategory,
  updatePropertyCategoryStatus,
  deletePropertyCategory,
};
