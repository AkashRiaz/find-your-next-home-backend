import { ErrorRequestHandler } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { sendResponse } from "../utils/rendResponse";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof ZodError) {
    sendResponse(res, {
      success: false,
      statusCode: httpStatus.BAD_REQUEST,
      message: "Request validation failed",
      data: error.issues,
    });
    return;
  }

  if (error instanceof AppError) {
    sendResponse(res, {
      success: false,
      statusCode: error.statusCode,
      message: error.message,
    });
    return;
  }

  sendResponse(res, {
    success: false,
    statusCode: httpStatus.INTERNAL_SERVER_ERROR,
    message: "Internal server error",
  });
};
