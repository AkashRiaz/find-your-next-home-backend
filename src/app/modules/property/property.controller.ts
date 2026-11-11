import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { PropertyService } from "./property.service";
import {
  createPropertyBodySchema,
  propertyIdParamsSchema,
  updatePropertyBodySchema,
  updatePropertyStatusBodySchema,
} from "./property.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getAllProperties = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyService.getAllProperties(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Properties fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyProperties = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await PropertyService.getMyProperties(user.userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Your properties fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllPropertiesForAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PropertyService.getAllPropertiesForAdmin(req.query);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Properties fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getSingleProperty = catchAsync(async (req: Request, res: Response) => {
  const { id } = propertyIdParamsSchema.parse(req.params);
  const result = await PropertyService.getSingleProperty(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property fetched successfully",
    data: result,
  });
});

const getMySingleProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { id } = propertyIdParamsSchema.parse(req.params);
  const result = await PropertyService.getMySingleProperty(id, user.userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property fetched successfully",
    data: result,
  });
});

const createProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const payload = createPropertyBodySchema.parse(req.body);
  const result = await PropertyService.createProperty(user.userId, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Property draft created successfully",
    data: result,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { id } = propertyIdParamsSchema.parse(req.params);
  const payload = updatePropertyBodySchema.parse(req.body);
  const result = await PropertyService.updateProperty(id, user.userId, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property updated successfully",
    data: result,
  });
});

const updatePropertyStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { id } = propertyIdParamsSchema.parse(req.params);
  const payload = updatePropertyStatusBodySchema.parse(req.body);
  const result = await PropertyService.updatePropertyStatus(
    id,
    user.userId,
    payload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property status updated successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { id } = propertyIdParamsSchema.parse(req.params);
  const result = await PropertyService.deleteProperty(id, user.userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Property deleted successfully",
    data: result,
  });
});

export const PropertyController = {
  getAllProperties,
  getMyProperties,
  getAllPropertiesForAdmin,
  getSingleProperty,
  getMySingleProperty,
  createProperty,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
};
