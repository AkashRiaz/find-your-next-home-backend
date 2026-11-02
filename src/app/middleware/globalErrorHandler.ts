import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { config } from "../config";
import { AppError } from "../utils/AppError";

const isDevelopment = config.node_env === "development";

export const globalErrorHandler = (
  // biome-ignore lint/suspicious/noExplicitAny: errors can be of any shape
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (isDevelopment) {
    console.log("Error from Global Error Handler", err);
  }

  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let errorMessage: string = err?.message || "Internal Server Error";
  let errorName: string = err?.name || "Internal Server Error";
  let errorDetails: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorMessage = err.message;
  } else if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    errorMessage = "Request validation failed";
    errorDetails = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof SyntaxError && "body" in err) {
    // Thrown by express.json() when the request body is broken JSON.
    statusCode = httpStatus.BAD_REQUEST;
    errorMessage = "Request body must be valid JSON";
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    errorMessage = "You have provided incorrect field type or missing fields";
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = httpStatus.CONFLICT;
      errorMessage = "A record with this value already exists";
    } else if (err.code === "P2003") {
      statusCode = httpStatus.CONFLICT;
      errorMessage = "This record is linked to other data and cannot be changed";
    } else if (err.code === "P2025") {
      statusCode = httpStatus.NOT_FOUND;
      errorMessage = "Record not found";
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    if (err.errorCode === "P1000") {
      statusCode = httpStatus.INTERNAL_SERVER_ERROR;
      errorMessage = "Authentication failed against the database server";
    } else if (err.errorCode === "P1001") {
      statusCode = httpStatus.SERVICE_UNAVAILABLE;
      errorMessage = "Can't reach the database server";
    }
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    errorMessage = "Error occurred during query execution";
  }

  // Never leak internal error text to clients in production.
  const isServerError = statusCode >= 500;
  if (!isDevelopment) {
    errorName = isServerError ? "Internal Server Error" : "Request Error";
    if (isServerError) errorMessage = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    name: errorName,
    message: errorMessage,
    errorDetails,
    error: isDevelopment ? err : undefined,
    stack: isDevelopment ? err?.stack : undefined,
  });
};
