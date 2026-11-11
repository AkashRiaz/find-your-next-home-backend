import httpStatus from "http-status";
import { ListingStatus } from "../../../generated/prisma/enums";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { findOwnedPropertyOrThrow } from "../property/property.utils";

/**
 * Returns the listing if `ownerId` owns it and may still change it.
 * Suspended listings are locked, as in the property module.
 */
export const findEditablePropertyOrThrow = async (
  propertyId: string,
  ownerId: string,
) => {
  const property = await findOwnedPropertyOrThrow(propertyId, ownerId);

  if (property.status === ListingStatus.SUSPENDED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This listing is suspended and its photos cannot be changed",
    );
  }

  return property;
};

/** Returns a photo that belongs to this listing. */
export const findPropertyImageOrThrow = async (
  imageId: string,
  propertyId: string,
) => {
  const image = await prisma.propertyImage.findUnique({
    where: { id: imageId },
    select: { id: true, propertyId: true, isCover: true, publicId: true },
  });

  if (!image || image.propertyId !== propertyId) {
    throw new AppError(httpStatus.NOT_FOUND, "Image not found");
  }

  return image;
};

/** Throws unless `imageIds` lists every photo of the listing exactly once. */
export const ensureCompleteImageList = async (
  propertyId: string,
  imageIds: string[],
): Promise<void> => {
  const images = await prisma.propertyImage.findMany({
    where: { propertyId },
    select: { id: true },
  });

  const currentIds = new Set(images.map((image) => image.id));
  const isComplete =
    imageIds.length === currentIds.size && imageIds.every((id) => currentIds.has(id));

  if (!isComplete) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `imageIds must list all ${currentIds.size} photos of this listing, each once`,
    );
  }
};
