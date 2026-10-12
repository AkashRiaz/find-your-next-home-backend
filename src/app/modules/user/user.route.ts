import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { UserController } from "./user.controller";

const router = Router();

router.get(
  "/me",
  auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getMe,
);

export const UserRoutes = router;
