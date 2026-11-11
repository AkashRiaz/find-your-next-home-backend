import httpStatus from "http-status";
import { ListingStatus } from "../../../generated/prisma/enums";
import { AppError } from "../../utils/AppError";
import { findOwnedPropertyOrThrow } from "../property/property.utils";

/**
 * Returns the property if it belongs to `ownerId` and can still be edited.
 * Suspended listings are locked, the same as in the property module.
 */
export const findEditablePropertyOrThrow = async (
  propertyId: string,
  ownerId: string,
) => {
  const property = await findOwnedPropertyOrThrow(propertyId, ownerId);

  if (property.status === ListingStatus.SUSPENDED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This listing is suspended and cannot be edited",
    );
  }

  return property;
};
