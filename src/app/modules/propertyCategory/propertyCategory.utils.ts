import httpStatus from "http-status";
import { PropertyType } from "../../../generated/prisma/enums";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { toSlug } from "../../utils/slug";
import { PROPERTY_CATEGORY_SLUG_MAX_LENGTH } from "./propertyCategory.constant";

export const isPropertyType = (value: unknown): value is PropertyType =>
  Object.values(PropertyType).includes(value as PropertyType);

export const generateValidPropertyCategorySlug = (name: string): string => {
  const slug = toSlug(name);

  if (!slug || slug.length > PROPERTY_CATEGORY_SLUG_MAX_LENGTH) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Category name must contain letters or numbers and produce a slug of at most ${PROPERTY_CATEGORY_SLUG_MAX_LENGTH} characters`,
    );
  }

  return slug;
};

export const ensurePropertyCategoryExists = async (
  id: string,
): Promise<void> => {
  const category = await prisma.propertyCategory.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Property category not found");
  }
};

/**
 * Throws if another category already uses this slug.
 * Pass `currentCategoryId` when updating, so the category does not clash with itself.
 */
export const ensurePropertyCategorySlugIsAvailable = async (
  slug: string,
  currentCategoryId?: string,
): Promise<void> => {
  const existingCategory = await prisma.propertyCategory.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingCategory && existingCategory.id !== currentCategoryId) {
    throw new AppError(
      httpStatus.CONFLICT,
      "A property category with this name already exists",
    );
  }
};
