import { LocationType } from "../../../generated/prisma/enums";
import type { LocationSelect } from "../../../generated/prisma/models/Location";

export const LOCATION_NAME_MAX_LENGTH = 150;
export const LOCATION_SLUG_MAX_LENGTH = 160;

/**
 * Which location types each type may be nested under.
 * Example: a DISTRICT must sit under a DIVISION; a COUNTRY has no parent.
 */
export const ALLOWED_PARENT_TYPES: Record<
  LocationType,
  readonly LocationType[]
> = {
  COUNTRY: [],
  DIVISION: [LocationType.COUNTRY],
  DISTRICT: [LocationType.DIVISION],
  UPAZILA: [LocationType.DISTRICT],
  UNION: [LocationType.UPAZILA],
  AREA: [LocationType.UPAZILA, LocationType.UNION],
};

/** Full set of fields returned for a location. */
export const locationSelectFields = {
  id: true,
  name: true,
  slug: true,
  type: true,
  parentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies LocationSelect;

/** Compact fields used when a location is embedded as a parent or child. */
export const locationSummarySelectFields = {
  id: true,
  name: true,
  slug: true,
  type: true,
  isActive: true,
} as const satisfies LocationSelect;
