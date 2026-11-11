import httpStatus from "http-status";
import { ListingStatus } from "../../../generated/prisma/enums";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

/**
 * Checks that a user may save this property:
 * - it must be a published listing
 * - it must not be the user's own listing
 */
export const ensurePropertyCanBeFavorited = async (
  propertyId: string,
  userId: string,
): Promise<void> => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { ownerId: true, status: true },
  });

  if (!property || property.status !== ListingStatus.PUBLISHED) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  if (property.ownerId === userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You cannot add your own listing to favorites",
    );
  }
};

export const ensureNotAlreadyFavorited = async (
  userId: string,
  propertyId: string,
): Promise<void> => {
  const existingFavorite = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
    select: { id: true },
  });

  if (existingFavorite) {
    throw new AppError(
      httpStatus.CONFLICT,
      "This property is already in your favorites",
    );
  }
};
