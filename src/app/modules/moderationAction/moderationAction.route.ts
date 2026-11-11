import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { ModerationActionController } from "./moderationAction.controller";

const router = Router();

const adminOnly = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Admin routes. The log is append-only: there are no update or delete routes.
router.post("/", adminOnly, ModerationActionController.createModerationAction);
router.get("/", adminOnly, ModerationActionController.getAllModerationActions);
router.get("/:id", adminOnly, ModerationActionController.getSingleModerationAction);

export const ModerationActionRoutes = router;
