import httpStatus from "http-status";
import { z } from "zod";
import {
  AdvertiserType,
  FurnishingStatus,
  GenderPreference,
  ListingStatus,
  PreferredTenant,
  PropertyType,
} from "../../../generated/prisma/enums";
import type { PropertyWhereInput } from "../../../generated/prisma/models/Property";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  ensureLocationAndAncestorsAreActive,
  getActiveLocationAndDescendantIds,
} from "../location/location.utils";
import type { ICreatePropertyPayload } from "./property.interface";

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

export const isEnumValue = <T extends Record<string, string>>(
  values: T,
  value: unknown,
): value is T[keyof T] => Object.values(values).includes(value as string);

/** Reads an optional number from the query string, e.g. ?minRent=5000. */
export const parseNumberQuery = (
  value: unknown,
  field: string,
): number | undefined => {
  if (value === undefined || value === "") return undefined;

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new AppError(httpStatus.BAD_REQUEST, `${field} must be a number`);
  }

  return number;
};

/** Reads an optional UUID from the query string, e.g. ?categoryId=... */
export const parseIdQuery = (
  value: unknown,
  field: string,
): string | undefined => {
  if (value === undefined || value === "") return undefined;

  if (!z.uuid().safeParse(value).success) {
    throw new AppError(httpStatus.BAD_REQUEST, `${field} must be a valid UUID`);
  }

  return value as string;
};

/**
 * Builds the search and filter conditions shared by every property list.
 * Status and owner filters are added by each list endpoint.
 */
export const buildPropertyFilters = async (
  query: IQuery,
): Promise<PropertyWhereInput[]> => {
  const andConditions: PropertyWhereInput[] = [];

  // Search
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: query.searchTerm, mode: "insensitive" } },
        { description: { contains: query.searchTerm, mode: "insensitive" } },
        { address: { contains: query.searchTerm, mode: "insensitive" } },
        { landmark: { contains: query.searchTerm, mode: "insensitive" } },
        { buildingName: { contains: query.searchTerm, mode: "insensitive" } },
        { village: { contains: query.searchTerm, mode: "insensitive" } },
        { sector: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  // Category filter
  const categoryId = parseIdQuery(query.categoryId, "categoryId");
  if (categoryId) {
    andConditions.push({ categoryId });
  }

  // Property type filter (RESIDENTIAL, SHARED, COMMERCIAL)
  if (isEnumValue(PropertyType, query.propertyType)) {
    andConditions.push({ category: { type: query.propertyType } });
  }

  // Location filter, including every location below it
  const locationId = parseIdQuery(query.locationId, "locationId");
  if (locationId) {
    const locationIds = await getActiveLocationAndDescendantIds(locationId);
    andConditions.push({ locationId: { in: locationIds } });
  }

  // Enum filters
  if (isEnumValue(AdvertiserType, query.advertiserType)) {
    andConditions.push({ advertiserType: query.advertiserType });
  }

  if (isEnumValue(FurnishingStatus, query.furnishingStatus)) {
    andConditions.push({ furnishingStatus: query.furnishingStatus });
  }

  if (isEnumValue(GenderPreference, query.genderPreference)) {
    andConditions.push({ genderPreference: query.genderPreference });
  }

  if (isEnumValue(PreferredTenant, query.preferredTenant)) {
    andConditions.push({ preferredTenant: query.preferredTenant });
  }

  // Rent range
  const minRent = parseNumberQuery(query.minRent, "minRent");
  const maxRent = parseNumberQuery(query.maxRent, "maxRent");
  if (minRent !== undefined || maxRent !== undefined) {
    andConditions.push({ monthlyRent: { gte: minRent, lte: maxRent } });
  }

  // Room filters
  const bedrooms = parseNumberQuery(query.bedrooms, "bedrooms");
  if (bedrooms !== undefined) {
    andConditions.push({ bedrooms });
  }

  const bathrooms = parseNumberQuery(query.bathrooms, "bathrooms");
  if (bathrooms !== undefined) {
    andConditions.push({ bathrooms });
  }

  // Negotiable filter
  if (query.isNegotiable === "true" || query.isNegotiable === "false") {
    andConditions.push({ isNegotiable: query.isNegotiable === "true" });
  }

  return andConditions;
};

// ---------------------------------------------------------------------------
// Checks before saving
// ---------------------------------------------------------------------------

/**
 * Returns the property if it exists and belongs to `ownerId`.
 * Someone else's property is reported as "not found", so ids are not leaked.
 */
export const findOwnedPropertyOrThrow = async (id: string, ownerId: string) => {
  const property = await prisma.property.findUnique({ where: { id } });

  if (!property || property.ownerId !== ownerId) {
    throw new AppError(httpStatus.NOT_FOUND, "Property not found");
  }

  return property;
};

/** Checks that the chosen category, location and amenities are all active. */
export const validatePropertyReferences = async (
  payload: Pick<
    ICreatePropertyPayload,
    "categoryId" | "locationId" | "amenityIds"
  >,
): Promise<void> => {
  if (payload.categoryId) {
    const category = await prisma.propertyCategory.findUnique({
      where: { id: payload.categoryId },
      select: { isActive: true },
    });

    if (!category?.isActive) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Active property category not found",
      );
    }
  }

  if (payload.locationId) {
    await ensureLocationAndAncestorsAreActive(payload.locationId);
  }

  if (payload.amenityIds?.length) {
    const activeAmenityCount = await prisma.amenity.count({
      where: { id: { in: payload.amenityIds }, isActive: true },
    });

    if (activeAmenityCount !== payload.amenityIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "One or more amenities were not found or are inactive",
      );
    }
  }
};

type PropertyCounts = {
  totalSeats?: number | null;
  availableSeats?: number | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
};

/** Checks numbers that depend on each other, e.g. seats and floors. */
export const validatePropertyCounts = (values: PropertyCounts): void => {
  const { totalSeats, availableSeats, floorNumber, totalFloors } = values;

  if (totalSeats != null && availableSeats != null && availableSeats > totalSeats) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "availableSeats cannot be more than totalSeats",
    );
  }

  if (floorNumber != null && totalFloors != null && floorNumber > totalFloors) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "floorNumber cannot be higher than totalFloors",
    );
  }
};

type PublishableProperty = {
  title: string | null;
  description: string | null;
  categoryId: string | null;
  locationId: string | null;
  monthlyRent: unknown;
  bedrooms: number | null;
  bathrooms: number | null;
  totalSeats: number | null;
  availableSeats: number | null;
};

/**
 * Throws if a listing is missing what renters need to see.
 * - Every listing needs a title, description, category, location and rent.
 * - Residential listings also need bedrooms and bathrooms.
 * - Shared listings also need totalSeats and availableSeats.
 */
export const ensurePropertyIsReadyToPublish = async (
  property: PublishableProperty,
): Promise<void> => {
  const missingFields: string[] = [];

  if (!property.title) missingFields.push("title");
  if (!property.description) missingFields.push("description");
  if (!property.categoryId) missingFields.push("categoryId");
  if (!property.locationId) missingFields.push("locationId");
  if (property.monthlyRent == null) missingFields.push("monthlyRent");

  if (property.categoryId) {
    const category = await prisma.propertyCategory.findUnique({
      where: { id: property.categoryId },
      select: { type: true, isActive: true },
    });

    if (!category?.isActive) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "The selected property category is no longer active",
      );
    }

    if (category.type === PropertyType.RESIDENTIAL) {
      if (property.bedrooms == null) missingFields.push("bedrooms");
      if (property.bathrooms == null) missingFields.push("bathrooms");
    }

    if (category.type === PropertyType.SHARED) {
      if (property.totalSeats == null) missingFields.push("totalSeats");
      if (property.availableSeats == null) missingFields.push("availableSeats");
    }
  }

  if (missingFields.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Fill in these fields before publishing: ${missingFields.join(", ")}`,
    );
  }

  if (property.locationId) {
    await ensureLocationAndAncestorsAreActive(property.locationId);
  }
};

/** The date field to stamp when a listing moves to a new status. */
export const getStatusTimestamps = (status: ListingStatus) => {
  const now = new Date();

  switch (status) {
    case ListingStatus.PUBLISHED:
      return { publishedAt: now };
    case ListingStatus.RENTED:
      return { rentedAt: now };
    case ListingStatus.ARCHIVED:
      return { archivedAt: now };
    default:
      return {};
  }
};

/** Removes keys whose value is undefined, so they do not overwrite data. */
export const withoutUndefined = <T extends object>(values: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
