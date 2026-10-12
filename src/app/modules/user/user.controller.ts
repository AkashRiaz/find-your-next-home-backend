import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { RequestUser } from "../../middleware/checkAuth";
import { UserService } from "./user.service";
import { sendResponse } from "../../utils/rendResponse";
import httpStatus from "http-status";


const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    const result = await UserService.getMe(user as RequestUser);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User Data fetched successfully",
      data: result,
    });
  },
);

export const UserController = {
  getMe,
};
