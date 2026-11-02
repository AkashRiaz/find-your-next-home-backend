import type { AmenitySelect } from "../../../generated/prisma/models/Amenity";

// Keep in sync with the column sizes in prisma/schema/amenity.prisma.
export const AMENITY_NAME_MAX_LENGTH = 100;
export const AMENITY_SLUG_MAX_LENGTH = 120;
export const AMENITY_ICON_MAX_LENGTH = 255;
export const AMENITY_DESCRIPTION_MAX_LENGTH = 500;

/** Fields returned for an amenity. */
export const amenitySelectFields = {
  id: true,
  name: true,
  slug: true,
  icon: true,
  description: true,
  isActive: true,
  createdAt: true,
} as const satisfies AmenitySelect;

/** Admin view also shows how many properties use each amenity. */
export const amenityAdminSelectFields = {
  ...amenitySelectFields,
  _count: { select: { properties: true } },
} as const satisfies AmenitySelect;
