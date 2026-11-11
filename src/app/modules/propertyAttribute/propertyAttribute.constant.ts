import type { PropertyAttributeSelect } from "../../../generated/prisma/models/PropertyAttribute";

// Keep in sync with the column sizes in prisma/schema/propertyAttribute.prisma.
export const ATTRIBUTE_KEY_MAX_LENGTH = 100;
export const ATTRIBUTE_TEXT_VALUE_MAX_LENGTH = 500;
export const ATTRIBUTE_LIST_VALUE_MAX_ITEMS = 50;
export const MAX_ATTRIBUTES_PER_PROPERTY = 50;

/** Keys are snake_case, e.g. "gas_type" or "water_source". */
export const ATTRIBUTE_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Fields returned for a property attribute. */
export const propertyAttributeSelectFields = {
  id: true,
  key: true,
  value: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies PropertyAttributeSelect;
