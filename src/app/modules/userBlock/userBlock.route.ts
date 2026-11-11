import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { UserBlockController } from "./userBlock.controller";

const router = Router();

const loggedInUser = auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Every block route belongs to the logged-in user.
router.get("/", loggedInUser, UserBlockController.getMyBlockedUsers);
router.get("/:blockedId", loggedInUser, UserBlockController.checkBlockStatus);
router.post("/", loggedInUser, UserBlockController.blockUser);
router.delete("/:blockedId", loggedInUser, UserBlockController.unblockUser);

export const UserBlockRoutes = router;
