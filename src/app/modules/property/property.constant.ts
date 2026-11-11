import { ListingStatus } from "../../../generated/prisma/enums";
import type {
  PropertyInclude,
  PropertySelect,
} from "../../../generated/prisma/models/Property";

// Keep in sync with the column sizes in prisma/schema/property.prisma.
export const PROPERTY_TITLE_MAX_LENGTH = 200;
export const PROPERTY_DESCRIPTION_MAX_LENGTH = 5000;
export const PROPERTY_ADDRESS_MAX_LENGTH = 500;
export const PROPERTY_LANDMARK_MAX_LENGTH = 255;

/** Largest value a Decimal(12, 2) column can store. */
export const PROPERTY_MONEY_MAX = 9_999_999_999.99;

/** Statuses an owner may move their listing to. SUSPENDED is admin-only. */
export const OWNER_SETTABLE_STATUSES = [
  ListingStatus.DRAFT,
  ListingStatus.PUBLISHED,
  ListingStatus.RENTED,
  ListingStatus.ARCHIVED,
] as const;

/**
 * Which status an owner can move a listing to from its current status.
 * Example: a DRAFT can only be PUBLISHED; a SUSPENDED listing is locked.
 */
export const OWNER_STATUS_TRANSITIONS: Record<
  ListingStatus,
  readonly ListingStatus[]
> = {
  DRAFT: [ListingStatus.PUBLISHED],
  PUBLISHED: [ListingStatus.RENTED, ListingStatus.ARCHIVED],
  RENTED: [ListingStatus.PUBLISHED, ListingStatus.ARCHIVED],
  ARCHIVED: [ListingStatus.PUBLISHED, ListingStatus.DRAFT],
  SUSPENDED: [],
};

/** Statuses that are visible to the public and must stay complete. */
export const LIVE_STATUSES: readonly ListingStatus[] = [
  ListingStatus.PUBLISHED,
  ListingStatus.RENTED,
];

/** Compact fields for list pages (property cards). */
export const propertyCardSelectFields = {
  id: true,
  title: true,
  status: true,
  advertiserType: true,
  monthlyRent: true,
  isNegotiable: true,
  bedrooms: true,
  bathrooms: true,
  areaSqFt: true,
  furnishingStatus: true,
  totalSeats: true,
  availableSeats: true,
  genderPreference: true,
  preferredTenant: true,
  address: true,
  availableFrom: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true, type: true } },
  location: { select: { id: true, name: true, slug: true, type: true } },
  // Cover image first, then by display order.
  images: {
    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
    take: 1,
    select: { imageUrl: true, altText: true },
  },
} as const satisfies PropertySelect;

/** Admin list also shows who owns each listing. */
export const propertyAdminCardSelectFields = {
  ...propertyCardSelectFields,
  owner: { select: { id: true, name: true, email: true } },
} as const satisfies PropertySelect;

/** Related data shown on the property detail page. */
export const propertyDetailIncludeFields = {
  owner: { select: { id: true, name: true, avatarUrl: true } },
  category: { select: { id: true, name: true, slug: true, type: true } },
  location: { select: { id: true, name: true, slug: true, type: true } },
  images: {
    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      imageUrl: true,
      altText: true,
      isCover: true,
      sortOrder: true,
    },
  },
  amenities: {
    select: {
      amenity: { select: { id: true, name: true, slug: true, icon: true } },
    },
  },
  attributes: { select: { key: true, value: true } },
} as const satisfies PropertyInclude;
