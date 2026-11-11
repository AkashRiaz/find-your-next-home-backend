import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { ModerationActionService } from "./moderationAction.service";
import {
  createModerationActionBodySchema,
  moderationActionIdParamsSchema,
} from "./moderationAction.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const createModerationAction = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as RequestUser;
    const payload = createModerationActionBodySchema.parse(req.body);
    const result = await ModerationActionService.createModerationAction(
      { userId: user.userId, role: user.role },
      payload,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Moderation action taken successfully",
      data: result,
    });
  },
);

const getAllModerationActions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ModerationActionService.getAllModerationActions(
      req.query,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Moderation actions fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getSingleModerationAction = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = moderationActionIdParamsSchema.parse(req.params);
    const result = await ModerationActionService.getSingleModerationAction(id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Moderation action fetched successfully",
      data: result,
    });
  },
);

export const ModerationActionController = {
  createModerationAction,
  getAllModerationActions,
  getSingleModerationAction,
};
