import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { PropertyCategoryService } from "./propertyCategory.service";
import {
  createPropertyCategoryBodySchema,
  propertyCategoryIdParamsSchema,
  updatePropertyCategoryBodySchema,
  updatePropertyCategoryStatusBodySchema,
} from "./propertyCategory.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getAllPropertyCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PropertyCategoryService.getAllPropertyCategories(
      req.query,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property categories fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getAllPropertyCategoriesForAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await PropertyCategoryService.getAllPropertyCategoriesForAdmin(req.query);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property categories fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getSinglePropertyCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = propertyCategoryIdParamsSchema.parse(req.params);
    const result = await PropertyCategoryService.getSinglePropertyCategory(id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property category fetched successfully",
      data: result,
    });
  },
);

const createPropertyCategory = catchAsync(
  async (req: Request, res: Response) => {
    const payload = createPropertyCategoryBodySchema.parse(req.body);
    const result = await PropertyCategoryService.createPropertyCategory(payload);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Property category created successfully",
      data: result,
    });
  },
);

const updatePropertyCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = propertyCategoryIdParamsSchema.parse(req.params);
    const payload = updatePropertyCategoryBodySchema.parse(req.body);
    const result = await PropertyCategoryService.updatePropertyCategory(
      id,
      payload,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property category updated successfully",
      data: result,
    });
  },
);

const updatePropertyCategoryStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = propertyCategoryIdParamsSchema.parse(req.params);
    const payload = updatePropertyCategoryStatusBodySchema.parse(req.body);
    const result = await PropertyCategoryService.updatePropertyCategoryStatus(
      id,
      payload,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property category status updated successfully",
      data: result,
    });
  },
);

const deletePropertyCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = propertyCategoryIdParamsSchema.parse(req.params);
    const result = await PropertyCategoryService.deletePropertyCategory(id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Property category deleted successfully",
      data: result,
    });
  },
);

export const PropertyCategoryController = {
  getAllPropertyCategories,
  getAllPropertyCategoriesForAdmin,
  getSinglePropertyCategory,
  createPropertyCategory,
  updatePropertyCategory,
  updatePropertyCategoryStatus,
  deletePropertyCategory,
};
