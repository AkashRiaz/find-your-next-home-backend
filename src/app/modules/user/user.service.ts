import prisma from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const getMe = async (payload: RequestUser) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    omit: {
      password: true,
    },
  });

  if (!isUserExist) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return isUserExist;
};

export const UserService = {
  getMe,
};
