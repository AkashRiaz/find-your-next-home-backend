import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { AmenityService } from "./amenity.service";
import {
  amenityIdParamsSchema,
  createAmenityBodySchema,
  updateAmenityBodySchema,
  updateAmenityStatusBodySchema,
} from "./amenity.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getAllAmenities = catchAsync(async (req: Request, res: Response) => {
  const result = await AmenityService.getAllAmenities(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Amenities fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllAmenitiesForAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AmenityService.getAllAmenitiesForAdmin(req.query);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Amenities fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getSingleAmenity = catchAsync(async (req: Request, res: Response) => {
  const { id } = amenityIdParamsSchema.parse(req.params);
  const result = await AmenityService.getSingleAmenity(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Amenity fetched successfully",
    data: result,
  });
});

const createAmenity = catchAsync(async (req: Request, res: Response) => {
  const payload = createAmenityBodySchema.parse(req.body);
  const result = await AmenityService.createAmenity(payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Amenity created successfully",
    data: result,
  });
});

const updateAmenity = catchAsync(async (req: Request, res: Response) => {
  const { id } = amenityIdParamsSchema.parse(req.params);
  const payload = updateAmenityBodySchema.parse(req.body);
  const result = await AmenityService.updateAmenity(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Amenity updated successfully",
    data: result,
  });
});

const updateAmenityStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = amenityIdParamsSchema.parse(req.params);
  const payload = updateAmenityStatusBodySchema.parse(req.body);
  const result = await AmenityService.updateAmenityStatus(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Amenity status updated successfully",
    data: result,
  });
});

const deleteAmenity = catchAsync(async (req: Request, res: Response) => {
  const { id } = amenityIdParamsSchema.parse(req.params);
  const result = await AmenityService.deleteAmenity(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Amenity deleted successfully",
    data: result,
  });
});

export const AmenityController = {
  getAllAmenities,
  getAllAmenitiesForAdmin,
  getSingleAmenity,
  createAmenity,
  updateAmenity,
  updateAmenityStatus,
  deleteAmenity,
};
