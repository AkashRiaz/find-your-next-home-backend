import { NextFunction, Request, Response } from "express";
import { UserRole, UserStatus } from "../../generated/prisma/enums";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import httpStatus from "http-status";
import { jwtUtils } from "../utils/jwt";
import { config } from "../config";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../lib/prisma";

export interface RequestUser {
  email: string;
  name: string;
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export const auth = (...requiredRoles: UserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization?.trim();

    console.log(req);
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

    const cookieToken =
      typeof req.cookies.accessToken === "string"
        ? req.cookies.accessToken.trim()
        : undefined;

    const token = bearerToken || cookieToken;

    if (!token) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Unauthorized: No token provided",
      );
    }

    const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

    if (!verifiedToken.success) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Unauthorized: Invalid token",
      );
    }

    const { email, name, userId, role } = verifiedToken.data as JwtPayload;

    if (requiredRoles.length && !requiredRoles.includes(role as UserRole)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Forbidden: Insufficient permissions",
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        email,
        name,
        role,
      },
    });

    if (!user) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        "User not found. Please log in again.",
      );
    }


    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "User account is suspended. Please contact support.",
      );
    }

    if (user.isDeleted) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "User account is deleted. Please contact support.",
      );
    }

    req.user = {
      email,
      name,
      userId,
      role,
    };

    next();
  });
};
