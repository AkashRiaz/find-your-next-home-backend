import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { LocationController } from "./location.controller";

const router = Router();

router.get("/", LocationController.getAllLocations);
router.get("/:id/children", LocationController.getChildLocations);
router.get("/:id", LocationController.getSingleLocation);
router.post(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  LocationController.createLocation,
);
router.patch(
  "/:id/status",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  LocationController.updateLocationStatus,
);
router.patch(
  "/:id",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  LocationController.updateLocation,
);

export const LocationRoutes = router;
