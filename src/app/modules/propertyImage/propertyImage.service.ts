import httpStatus from "http-status";
import { deleteImages, uploadImageBuffer } from "../../lib/cloudinary";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  PROPERTY_IMAGE_MAX_COUNT,
  propertyImageFolder,
  propertyImageOrderBy,
  propertyImageSelectFields,
} from "./propertyImage.constant";
import type {
  IReorderPropertyImagesPayload,
  IUpdatePropertyImagePayload,
} from "./propertyImage.interface";
import {
  ensureCompleteImageList,
  findEditablePropertyOrThrow,
  findPropertyImageOrThrow,
} from "./propertyImage.utils";

const getImagesOfProperty = (propertyId: string) =>
  prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: propertyImageOrderBy,
    select: propertyImageSelectFields,
  });

/** The listing's photos, as its owner manages them. */
const getPropertyImages = async (ownerId: string, propertyId: string) => {
  await findEditablePropertyOrThrow(propertyId, ownerId);

  return getImagesOfProperty(propertyId);
};

/**
 * Uploads new photos to the end of the listing's gallery.
 * - A listing can have at most PROPERTY_IMAGE_MAX_COUNT photos.
 * - The first photo a listing gets becomes its cover.
 * - If any upload or the database save fails, the files already sent to
 *   Cloudinary are deleted again, so nothing is left half-saved.
 */
const uploadPropertyImages = async (
  ownerId: string,
  propertyId: string,
  files: Express.Multer.File[],
) => {
  await findEditablePropertyOrThrow(propertyId, ownerId);

  if (files.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Select at least one image to upload");
  }

  const existing = await prisma.propertyImage.aggregate({
    where: { propertyId },
    _count: { _all: true },
    _max: { sortOrder: true },
  });

  const existingCount = existing._count._all;

  if (existingCount + files.length > PROPERTY_IMAGE_MAX_COUNT) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `A listing can have at most ${PROPERTY_IMAGE_MAX_COUNT} photos. It has ${existingCount}, so you can add ${PROPERTY_IMAGE_MAX_COUNT - existingCount} more`,
    );
  }

  const results = await Promise.allSettled(
    files.map((file) => uploadImageBuffer(file.buffer, propertyImageFolder(propertyId))),
  );

  const uploaded = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  if (uploaded.length !== files.length) {
    await deleteImages(uploaded.map((image) => image.publicId));
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Some images could not be uploaded. Please try again",
    );
  }

  const nextSortOrder = (existing._max.sortOrder ?? -1) + 1;
  const hasCover = existingCount > 0;

  try {
    await prisma.propertyImage.createMany({
      data: uploaded.map((image, index) => ({
        propertyId,
        imageUrl: image.imageUrl,
        publicId: image.publicId,
        sortOrder: nextSortOrder + index,
        isCover: !hasCover && index === 0,
      })),
    });
  } catch (error) {
    await deleteImages(uploaded.map((image) => image.publicId));
    throw error;
  }

  return getImagesOfProperty(propertyId);
};

const updatePropertyImage = async (
  ownerId: string,
  propertyId: string,
  imageId: string,
  payload: IUpdatePropertyImagePayload,
) => {
  await findEditablePropertyOrThrow(propertyId, ownerId);
  await findPropertyImageOrThrow(imageId, propertyId);

  return prisma.propertyImage.update({
    where: { id: imageId },
    data: { altText: payload.altText },
    select: propertyImageSelectFields,
  });
};

/** Makes this photo the cover. A listing always has exactly one cover. */
const setCoverImage = async (
  ownerId: string,
  propertyId: string,
  imageId: string,
) => {
  await findEditablePropertyOrThrow(propertyId, ownerId);
  await findPropertyImageOrThrow(imageId, propertyId);

  await prisma.$transaction([
    prisma.propertyImage.updateMany({
      where: { propertyId, isCover: true },
      data: { isCover: false },
    }),
    prisma.propertyImage.update({
      where: { id: imageId },
      data: { isCover: true },
    }),
  ]);

  return getImagesOfProperty(propertyId);
};

/** Saves a new display order. The list must include every photo of the listing. */
const reorderPropertyImages = async (
  ownerId: string,
  propertyId: string,
  payload: IReorderPropertyImagesPayload,
) => {
  await findEditablePropertyOrThrow(propertyId, ownerId);
  await ensureCompleteImageList(propertyId, payload.imageIds);

  await prisma.$transaction(
    payload.imageIds.map((id, index) =>
      prisma.propertyImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return getImagesOfProperty(propertyId);
};

/**
 * Removes a photo from the listing and from Cloudinary.
 * If it was the cover, the next photo in order becomes the cover.
 */
const deletePropertyImage = async (
  ownerId: string,
  propertyId: string,
  imageId: string,
) => {
  await findEditablePropertyOrThrow(propertyId, ownerId);
  const image = await findPropertyImageOrThrow(imageId, propertyId);

  await prisma.$transaction(async (tx) => {
    await tx.propertyImage.delete({ where: { id: imageId } });

    if (image.isCover) {
      const nextCover = await tx.propertyImage.findFirst({
        where: { propertyId },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });

      if (nextCover) {
        await tx.propertyImage.update({
          where: { id: nextCover.id },
          data: { isCover: true },
        });
      }
    }
  });

  // Only after the database change is saved, so a failed delete never loses a live photo.
  await deleteImages([image.publicId]);

  return getImagesOfProperty(propertyId);
};

export const PropertyImageService = {
  getPropertyImages,
  uploadPropertyImages,
  updatePropertyImage,
  setCoverImage,
  reorderPropertyImages,
  deletePropertyImage,
};
