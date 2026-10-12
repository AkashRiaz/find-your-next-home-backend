import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IUserRegisterPayload } from "./auth.interface";
import httpStatus from "http-status";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import { config } from "../../config";
import { UserStatus } from "../../../generated/prisma/enums";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { jwtUtils } from "../../utils/jwt";

const registerUser = async (payload: IUserRegisterPayload) => {
  const { name, email, password, phone } = payload;

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User already exists with this email",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
    },
  });

  const expirationSeconds = 5 * 60;
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpKey = `user-verification-otp:${normalizedEmail}`;

  if (config.node_env === "development") {
    console.log(`Generated OTP for ${normalizedEmail}: ${otp}`);
  }

  await redisClient.set(otpKey, otp, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/user-verification-otp.ejs",
  );

  const html = await ejs.renderFile(templatePath, {
    name: newUser.name,
    otp,
    expirationMinutes: expirationSeconds / 60,
  });

  await transporter.sendMail({
    from: config.smtp_user,
    to: newUser.email,
    subject: "Your OTP for Email Verification",
    html,
  });

  return {
    message:
      "User registered successfully. Please check your email for the OTP to verify your account.",
  };
};

const verifyUserEmail = async (payload: any) => {
  const { email, otp } = payload;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is already verified");
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError(httpStatus.FORBIDDEN, "User account is suspended");
  }

  if (user.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, "User account is deleted");
  }

  const otpKey = `user-verification-otp:${normalizedEmail}`;
  const storedOtp = await redisClient.get(otpKey);

  if (!storedOtp || storedOtp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  const updatedUser = await prisma.user.update({
    where: { email: normalizedEmail },
    data: { isEmailVerified: true },
    omit: { password: true },
  });

  await redisClient.del(otpKey);

  const jwtPayload = {
    userId: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload as JwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload as JwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: any) => {
  const { email, password } = payload;
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  if (!user.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is not verified");
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError(httpStatus.FORBIDDEN, "User account is suspended");
  }
  if (user.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, "User account is deleted");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid password");
  }

  const jwtPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload as JwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload as JwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

export const AuthService = {
  registerUser,
  verifyUserEmail,
  loginUser,
};
