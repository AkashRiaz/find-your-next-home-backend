import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { PropertyAttributeService } from "./propertyAttribute.service";
import {
  propertyAttributeParamsSchema,
  propertyIdParamsSchema,
  replacePropertyAttributesBodySchema,
  upsertPropertyAttributeBodySchema,
} from "./propertyAttribute.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getPropertyAttributes = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as RequestUser;
    const { propertyId } = propertyIdParamsSchema.parse(req.params);
    const result = await PropertyAttributeService.getPropertyAttributes(
      propertyId,
      user.userId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property attributes fetched successfully",
      data: result,
    });
  },
);

const upsertPropertyAttribute = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as RequestUser;
    const { propertyId, key } = propertyAttributeParamsSchema.parse(req.params);
    const payload = upsertPropertyAttributeBodySchema.parse(req.body);
    const result = await PropertyAttributeService.upsertPropertyAttribute(
      propertyId,
      user.userId,
      key,
      payload,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property attribute saved successfully",
      data: result,
    });
  },
);

const replacePropertyAttributes = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as RequestUser;
    const { propertyId } = propertyIdParamsSchema.parse(req.params);
    const payload = replacePropertyAttributesBodySchema.parse(req.body);
    const result = await PropertyAttributeService.replacePropertyAttributes(
      propertyId,
      user.userId,
      payload,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property attributes replaced successfully",
      data: result,
    });
  },
);

const deletePropertyAttribute = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as RequestUser;
    const { propertyId, key } = propertyAttributeParamsSchema.parse(req.params);
    const result = await PropertyAttributeService.deletePropertyAttribute(
      propertyId,
      user.userId,
      key,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property attribute deleted successfully",
      data: result,
    });
  },
);

export const PropertyAttributeController = {
  getPropertyAttributes,
  upsertPropertyAttribute,
  replacePropertyAttributes,
  deletePropertyAttribute,
};
