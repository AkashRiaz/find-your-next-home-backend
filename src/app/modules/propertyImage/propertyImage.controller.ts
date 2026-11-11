import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { PropertyImageService } from "./propertyImage.service";
import {
  propertyIdParamsSchema,
  propertyImageParamsSchema,
  reorderPropertyImagesBodySchema,
  updatePropertyImageBodySchema,
} from "./propertyImage.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getPropertyImages = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { propertyId } = propertyIdParamsSchema.parse(req.params);
  const result = await PropertyImageService.getPropertyImages(
    user.userId,
    propertyId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property images fetched successfully",
    data: result,
  });
});

const uploadPropertyImages = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { propertyId } = propertyIdParamsSchema.parse(req.params);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const result = await PropertyImageService.uploadPropertyImages(
    user.userId,
    propertyId,
    files,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Property images uploaded successfully",
    data: result,
  });
});

const updatePropertyImage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { propertyId, imageId } = propertyImageParamsSchema.parse(req.params);
  const payload = updatePropertyImageBodySchema.parse(req.body);
  const result = await PropertyImageService.updatePropertyImage(
    user.userId,
    propertyId,
    imageId,
    payload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property image updated successfully",
    data: result,
  });
});

const setCoverImage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { propertyId, imageId } = propertyImageParamsSchema.parse(req.params);
  const result = await PropertyImageService.setCoverImage(
    user.userId,
    propertyId,
    imageId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Cover image updated successfully",
    data: result,
  });
});

const reorderPropertyImages = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { propertyId } = propertyIdParamsSchema.parse(req.params);
  const payload = reorderPropertyImagesBodySchema.parse(req.body);
  const result = await PropertyImageService.reorderPropertyImages(
    user.userId,
    propertyId,
    payload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property images reordered successfully",
    data: result,
  });
});

const deletePropertyImage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { propertyId, imageId } = propertyImageParamsSchema.parse(req.params);
  const result = await PropertyImageService.deletePropertyImage(
    user.userId,
    propertyId,
    imageId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property image deleted successfully",
    data: result,
  });
});

export const PropertyImageController = {
  getPropertyImages,
  uploadPropertyImages,
  updatePropertyImage,
  setCoverImage,
  reorderPropertyImages,
  deletePropertyImage,
};
