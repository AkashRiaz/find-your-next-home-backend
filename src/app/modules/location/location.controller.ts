import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { LocationService } from "./location.service";
import {
  createLocationBodySchema,
  getLocationsQuerySchema,
  locationIdParamsSchema,
  updateLocationBodySchema,
  updateLocationStatusBodySchema,
} from "./location.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getAllLocations = catchAsync(async (req: Request, res: Response) => {
  const query = getLocationsQuerySchema.parse(req.query);
  const result = await LocationService.getAllLocations(query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Locations fetched successfully",
    data: result,
  });
});

const getSingleLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = locationIdParamsSchema.parse(req.params);
  const result = await LocationService.getSingleLocation(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Location fetched successfully",
    data: result,
  });
});

const getChildLocations = catchAsync(async (req: Request, res: Response) => {
  const { id } = locationIdParamsSchema.parse(req.params);
  const result = await LocationService.getChildLocations(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Child locations fetched successfully",
    data: result,
  });
});

const createLocation = catchAsync(async (req: Request, res: Response) => {
  const payload = createLocationBodySchema.parse(req.body);
  const result = await LocationService.createLocation(payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Location created successfully",
    data: result,
  });
});

const updateLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = locationIdParamsSchema.parse(req.params);
  const payload = updateLocationBodySchema.parse(req.body);
  const result = await LocationService.updateLocation(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Location updated successfully",
    data: result,
  });
});

const updateLocationStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = locationIdParamsSchema.parse(req.params);
  const payload = updateLocationStatusBodySchema.parse(req.body);
  const result = await LocationService.updateLocationStatus(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Location status updated successfully",
    data: result,
  });
});

export const LocationController = {
  getAllLocations,
  getSingleLocation,
  getChildLocations,
  createLocation,
  updateLocation,
  updateLocationStatus,
};
