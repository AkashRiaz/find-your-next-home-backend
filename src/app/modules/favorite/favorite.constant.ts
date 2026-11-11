import type { FavoriteSelect } from "../../../generated/prisma/models/Favorite";
import { propertyCardSelectFields } from "../property/property.constant";

/** A saved listing, with the property shown as a card. */
export const favoriteSelectFields = {
  id: true,
  createdAt: true,
  property: { select: propertyCardSelectFields },
} as const satisfies FavoriteSelect;
