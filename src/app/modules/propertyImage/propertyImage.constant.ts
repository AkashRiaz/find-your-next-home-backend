import type {
  PropertyImageOrderByWithRelationInput,
  PropertyImageSelect,
} from "../../../generated/prisma/models/PropertyImage";

// Keep in sync with the column sizes in prisma/schema/propertyImage.prisma.
export const PROPERTY_IMAGE_ALT_TEXT_MAX_LENGTH = 255;

/** Most photos one listing can have. */
export const PROPERTY_IMAGE_MAX_COUNT = 15;

/** Most photos accepted in one upload request. */
export const PROPERTY_IMAGE_UPLOAD_BATCH_MAX = 10;

/** Multipart field name the app sends the files in. */
export const PROPERTY_IMAGE_UPLOAD_FIELD = "images";

/** Cloudinary folder for a listing's photos. */
export const propertyImageFolder = (propertyId: string) =>
  `find-your-next-home/properties/${propertyId}`;

/** Cover image first, then by display order (same order as the property module). */
export const propertyImageOrderBy = [
  { isCover: "desc" },
  { sortOrder: "asc" },
] as const satisfies PropertyImageOrderByWithRelationInput[];

/** Fields returned for a photo. publicId is internal to Cloudinary, so it is not exposed. */
export const propertyImageSelectFields = {
  id: true,
  imageUrl: true,
  altText: true,
  isCover: true,
  sortOrder: true,
  createdAt: true,
} as const satisfies PropertyImageSelect;
