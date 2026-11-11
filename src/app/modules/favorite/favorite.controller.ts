import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { FavoriteService } from "./favorite.service";
import {
  addFavoriteBodySchema,
  favoritePropertyIdParamsSchema,
} from "./favorite.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getMyFavorites = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await FavoriteService.getMyFavorites(user.userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Favorites fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const checkFavorite = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { propertyId } = favoritePropertyIdParamsSchema.parse(req.params);
  const result = await FavoriteService.checkFavorite(user.userId, propertyId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Favorite status fetched successfully",
    data: result,
  });
});

const addFavorite = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const payload = addFavoriteBodySchema.parse(req.body);
  const result = await FavoriteService.addFavorite(user.userId, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Property added to favorites",
    data: result,
  });
});

const removeFavorite = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { propertyId } = favoritePropertyIdParamsSchema.parse(req.params);
  const result = await FavoriteService.removeFavorite(user.userId, propertyId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property removed from favorites",
    data: result,
  });
});

export const FavoriteController = {
  getMyFavorites,
  checkFavorite,
  addFavorite,
  removeFavorite,
};
