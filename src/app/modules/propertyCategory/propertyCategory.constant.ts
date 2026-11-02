import type { PropertyCategorySelect } from "../../../generated/prisma/models/PropertyCategory";

// Keep in sync with the column sizes in prisma/schema/propertyCategory.prisma.
export const PROPERTY_CATEGORY_NAME_MAX_LENGTH = 100;
export const PROPERTY_CATEGORY_SLUG_MAX_LENGTH = 120;
export const PROPERTY_CATEGORY_ICON_MAX_LENGTH = 255;
export const PROPERTY_CATEGORY_DESCRIPTION_MAX_LENGTH = 500;

/** Fields returned for a property category. */
export const propertyCategorySelectFields = {
  id: true,
  name: true,
  slug: true,
  type: true,
  description: true,
  icon: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies PropertyCategorySelect;

/** Admin view also shows how many properties use each category. */
export const propertyCategoryAdminSelectFields = {
  ...propertyCategorySelectFields,
  _count: { select: { properties: true } },
} as const satisfies PropertyCategorySelect;
