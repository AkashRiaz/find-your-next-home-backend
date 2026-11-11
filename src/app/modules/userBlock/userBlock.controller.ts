import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { UserBlockService } from "./userBlock.service";
import {
  blockedUserIdParamsSchema,
  blockUserBodySchema,
} from "./userBlock.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getMyBlockedUsers = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await UserBlockService.getMyBlockedUsers(
    user.userId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Blocked users fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const checkBlockStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { blockedId } = blockedUserIdParamsSchema.parse(req.params);
  const result = await UserBlockService.checkBlockStatus(user.userId, blockedId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Block status fetched successfully",
    data: result,
  });
});

const blockUser = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const payload = blockUserBodySchema.parse(req.body);
  const result = await UserBlockService.blockUser(user.userId, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "User blocked successfully",
    data: result,
  });
});

const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { blockedId } = blockedUserIdParamsSchema.parse(req.params);
  const result = await UserBlockService.unblockUser(user.userId, blockedId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User unblocked successfully",
    data: result,
  });
});

export const UserBlockController = {
  getMyBlockedUsers,
  checkBlockStatus,
  blockUser,
  unblockUser,
};
