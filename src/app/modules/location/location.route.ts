import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { LocationController } from "./location.controller";

const router = Router();

const adminOnly = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Public routes
// Note: "/:id/children" must be registered before "/:id".
router.get("/", LocationController.getAllLocations);
router.get("/:id/children", LocationController.getChildLocations);
router.get("/:id", LocationController.getSingleLocation);

// Admin routes
router.post("/", adminOnly, LocationController.createLocation);
router.patch("/:id/status", adminOnly, LocationController.updateLocationStatus);
router.patch("/:id", adminOnly, LocationController.updateLocation);

export const LocationRoutes = router;
