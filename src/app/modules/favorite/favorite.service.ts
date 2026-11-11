import httpStatus from "http-status";
import type { FavoriteWhereInput } from "../../../generated/prisma/models/Favorite";
import type { IQuery } from "../../interfaces";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { favoriteSelectFields } from "./favorite.constant";
import type { IAddFavoritePayload } from "./favorite.interface";
import {
  ensureNotAlreadyFavorited,
  ensurePropertyCanBeFavorited,
} from "./favorite.utils";

/**
 * The user's saved listings, newest first.
 * Listings that were later rented or archived are still returned,
 * so the app can show them as "no longer available".
 */
const getMyFavorites = async (userId: string, query: IQuery) => {
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  const page = query.page ? parseInt(query.page, 10) : 1;

  const skip = (page - 1) * limit;

  const allowedSortFields = ["createdAt"];

  const sortBy = allowedSortFields.includes(query.sortBy || "")
    ? query.sortBy!
    : "createdAt";

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const andConditions: FavoriteWhereInput[] = [{ userId }];

  // Search
  if (query.searchTerm) {
    andConditions.push({
      property: {
        OR: [
          {
            title: {
              contains: query.searchTerm,
              mode: "insensitive",
            },
          },
          {
            address: {
              contains: query.searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
    });
  }

  const favorites = await prisma.favorite.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: favoriteSelectFields,
  });

  const total = await prisma.favorite.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: favorites,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/** Tells the app whether to show the heart icon as filled. */
const checkFavorite = async (userId: string, propertyId: string) => {
  const favorite = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
    select: { id: true },
  });

  return { propertyId, isFavorite: Boolean(favorite) };
};

const addFavorite = async (userId: string, payload: IAddFavoritePayload) => {
  await ensurePropertyCanBeFavorited(payload.propertyId, userId);
  await ensureNotAlreadyFavorited(userId, payload.propertyId);

  return prisma.favorite.create({
    data: { userId, propertyId: payload.propertyId },
    select: favoriteSelectFields,
  });
};

const removeFavorite = async (userId: string, propertyId: string) => {
  const favorite = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
    select: { id: true },
  });

  if (!favorite) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "This property is not in your favorites",
    );
  }

  return prisma.favorite.delete({
    where: { id: favorite.id },
    select: { id: true, createdAt: true },
  });
};

export const FavoriteService = {
  getMyFavorites,
  checkFavorite,
  addFavorite,
  removeFavorite,
};
