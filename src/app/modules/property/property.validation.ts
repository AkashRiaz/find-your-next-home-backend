import { z } from "zod";
import {
  AdvertiserType,
  FurnishingStatus,
  GenderPreference,
  PreferredTenant,
} from "../../../generated/prisma/enums";
import {
  OWNER_SETTABLE_STATUSES,
  PROPERTY_ADDRESS_MAX_LENGTH,
  PROPERTY_DESCRIPTION_MAX_LENGTH,
  PROPERTY_LANDMARK_MAX_LENGTH,
  PROPERTY_MONEY_MAX,
  PROPERTY_TITLE_MAX_LENGTH,
} from "./property.constant";

const propertyIdSchema = z.uuid({
  message: "Property id must be a valid UUID",
});

/**
 * Optional text field. An empty string or null clears the value.
 */
const optionalTextSchema = (field: string, maxLength: number) =>
  z
    .string({ message: `${field} must be a string` })
    .trim()
    .max(maxLength, {
      message: `${field} must be at most ${maxLength} characters`,
    })
    .transform((value) => value || null)
    .nullable()
    .optional();

/** Optional money amount, e.g. 15000 or 15000.50. */
const optionalMoneySchema = (field: string) =>
  z
    .number({ message: `${field} must be a number` })
    .nonnegative({ message: `${field} cannot be negative` })
    .max(PROPERTY_MONEY_MAX, { message: `${field} is too large` })
    .nullable()
    .optional();

/** Optional whole number within a range, e.g. bedrooms or floor number. */
const optionalCountSchema = (field: string, min: number, max: number) =>
  z
    .int({ message: `${field} must be a whole number` })
    .min(min, { message: `${field} must be at least ${min}` })
    .max(max, { message: `${field} must be at most ${max}` })
    .nullable()
    .optional();

const optionalIdSchema = (field: string) =>
  z.uuid({ message: `${field} must be a valid UUID` }).nullable().optional();

const enumSchema = <T extends Record<string, string>>(
  field: string,
  values: T,
) =>
  z.enum(values, {
    message: `${field} must be one of: ${Object.values(values).join(", ")}`,
  });

// Every field is optional, so an owner can save a draft and finish it later.
// Publishing checks that the required fields are filled in.
const propertyFields = {
  categoryId: optionalIdSchema("categoryId"),
  locationId: optionalIdSchema("locationId"),
  amenityIds: z
    .array(z.uuid({ message: "Each amenity id must be a valid UUID" }), {
      message: "amenityIds must be an array of ids",
    })
    .max(100, { message: "At most 100 amenities can be selected" })
    .transform((ids) => [...new Set(ids)])
    .optional(),

  advertiserType: enumSchema("advertiserType", AdvertiserType).optional(),

  title: optionalTextSchema("Title", PROPERTY_TITLE_MAX_LENGTH),
  description: optionalTextSchema(
    "Description",
    PROPERTY_DESCRIPTION_MAX_LENGTH,
  ),

  monthlyRent: optionalMoneySchema("monthlyRent"),
  securityDeposit: optionalMoneySchema("securityDeposit"),
  advanceAmount: optionalMoneySchema("advanceAmount"),
  serviceCharge: optionalMoneySchema("serviceCharge"),
  isNegotiable: z
    .boolean({ message: "isNegotiable must be true or false" })
    .optional(),

  bedrooms: optionalCountSchema("bedrooms", 0, 50),
  bathrooms: optionalCountSchema("bathrooms", 0, 50),
  balconies: optionalCountSchema("balconies", 0, 50),
  floorNumber: optionalCountSchema("floorNumber", -5, 200),
  totalFloors: optionalCountSchema("totalFloors", 1, 200),
  areaSqFt: optionalCountSchema("areaSqFt", 1, 1_000_000),
  furnishingStatus: enumSchema("furnishingStatus", FurnishingStatus)
    .nullable()
    .optional(),

  totalSeats: optionalCountSchema("totalSeats", 1, 500),
  availableSeats: optionalCountSchema("availableSeats", 0, 500),
  sharingCapacity: optionalCountSchema("sharingCapacity", 1, 50),
  genderPreference: enumSchema("genderPreference", GenderPreference).optional(),
  preferredTenant: enumSchema("preferredTenant", PreferredTenant).optional(),

  holdingNumber: optionalTextSchema("Holding number", 100),
  houseNumber: optionalTextSchema("House number", 100),
  roadNumber: optionalTextSchema("Road number", 100),
  buildingName: optionalTextSchema("Building name", 200),
  flatNumber: optionalTextSchema("Flat number", 50),
  block: optionalTextSchema("Block", 100),
  sector: optionalTextSchema("Sector", 100),
  village: optionalTextSchema("Village", 150),
  wardNumber: optionalTextSchema("Ward number", 50),
  postalCode: optionalTextSchema("Postal code", 20),
  address: optionalTextSchema("Address", PROPERTY_ADDRESS_MAX_LENGTH),
  landmark: optionalTextSchema("Landmark", PROPERTY_LANDMARK_MAX_LENGTH),
  latitude: z
    .number({ message: "latitude must be a number" })
    .min(-90, { message: "latitude must be between -90 and 90" })
    .max(90, { message: "latitude must be between -90 and 90" })
    .nullable()
    .optional(),
  longitude: z
    .number({ message: "longitude must be a number" })
    .min(-180, { message: "longitude must be between -180 and 180" })
    .max(180, { message: "longitude must be between -180 and 180" })
    .nullable()
    .optional(),

  availableFrom: z.iso
    .date({ message: "availableFrom must be a date like 2026-12-01" })
    .transform((value) => new Date(value))
    .nullable()
    .optional(),
  minimumStayMonths: optionalCountSchema("minimumStayMonths", 1, 120),
};

export const propertyIdParamsSchema = z.object({
  id: propertyIdSchema,
});

export const createPropertyBodySchema = z.object(propertyFields).strict();

export const updatePropertyBodySchema = z
  .object(propertyFields)
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  });

export const updatePropertyStatusBodySchema = z
  .object({
    status: z.enum(OWNER_SETTABLE_STATUSES, {
      message: `status must be one of: ${OWNER_SETTABLE_STATUSES.join(", ")}`,
    }),
  })
  .strict();
