import httpStatus from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { toSlug } from "../../utils/slug";
import { AMENITY_SLUG_MAX_LENGTH } from "./amenity.constant";

export const generateValidAmenitySlug = (name: string): string => {
  const slug = toSlug(name);

  if (!slug || slug.length > AMENITY_SLUG_MAX_LENGTH) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Amenity name must contain letters or numbers and produce a slug of at most ${AMENITY_SLUG_MAX_LENGTH} characters`,
    );
  }

  return slug;
};

export const ensureAmenityExists = async (id: string): Promise<void> => {
  const amenity = await prisma.amenity.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!amenity) {
    throw new AppError(httpStatus.NOT_FOUND, "Amenity not found");
  }
};

/**
 * Throws if another amenity already uses this slug.
 * Pass `currentAmenityId` when updating, so the amenity does not clash with itself.
 */
export const ensureAmenitySlugIsAvailable = async (
  slug: string,
  currentAmenityId?: string,
): Promise<void> => {
  const existingAmenity = await prisma.amenity.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingAmenity && existingAmenity.id !== currentAmenityId) {
    throw new AppError(
      httpStatus.CONFLICT,
      "An amenity with this name already exists",
    );
  }
};
