import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { ReportController } from "./report.controller";

const router = Router();

const loggedInUser = auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);
const adminOnly = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// "/my" routes must be registered before "/:id", or "my" is read as an id.

// Reporter routes
router.post("/", loggedInUser, ReportController.createReport);
router.get("/my", loggedInUser, ReportController.getMyReports);
router.get("/my/:id", loggedInUser, ReportController.getMySingleReport);
router.delete("/my/:id", loggedInUser, ReportController.withdrawReport);

// Admin routes
router.get("/", adminOnly, ReportController.getAllReports);
router.get("/:id", adminOnly, ReportController.getSingleReport);
router.patch("/:id/status", adminOnly, ReportController.updateReportStatus);

export const ReportRoutes = router;
