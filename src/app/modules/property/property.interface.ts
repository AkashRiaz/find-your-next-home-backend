import type {
  AdvertiserType,
  FurnishingStatus,
  GenderPreference,
  PreferredTenant,
} from "../../../generated/prisma/enums";
import type { OWNER_SETTABLE_STATUSES } from "./property.constant";

export interface ICreatePropertyPayload {
  categoryId?: string | null;
  locationId?: string | null;
  amenityIds?: string[];

  advertiserType?: AdvertiserType;

  title?: string | null;
  description?: string | null;

  monthlyRent?: number | null;
  securityDeposit?: number | null;
  advanceAmount?: number | null;
  serviceCharge?: number | null;
  isNegotiable?: boolean;

  bedrooms?: number | null;
  bathrooms?: number | null;
  balconies?: number | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
  areaSqFt?: number | null;
  furnishingStatus?: FurnishingStatus | null;

  totalSeats?: number | null;
  availableSeats?: number | null;
  sharingCapacity?: number | null;
  genderPreference?: GenderPreference;
  preferredTenant?: PreferredTenant;

  holdingNumber?: string | null;
  houseNumber?: string | null;
  roadNumber?: string | null;
  buildingName?: string | null;
  flatNumber?: string | null;
  block?: string | null;
  sector?: string | null;
  village?: string | null;
  wardNumber?: string | null;
  postalCode?: string | null;
  address?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  availableFrom?: Date | null;
  minimumStayMonths?: number | null;
}

// Update accepts the same fields; every field is optional in both.
export type IUpdatePropertyPayload = ICreatePropertyPayload;

export interface IUpdatePropertyStatusPayload {
  status: (typeof OWNER_SETTABLE_STATUSES)[number];
}
