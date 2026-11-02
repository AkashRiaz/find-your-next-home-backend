import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AmenityController } from "./amenity.controller";

const router = Router();

const adminOnly = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Admin list must be registered before "/:id", or "admin" is read as an id.
router.get("/admin", adminOnly, AmenityController.getAllAmenitiesForAdmin);

// Public routes
router.get("/", AmenityController.getAllAmenities);
router.get("/:id", AmenityController.getSingleAmenity);

// Admin routes
router.post("/", adminOnly, AmenityController.createAmenity);
router.patch("/:id/status", adminOnly, AmenityController.updateAmenityStatus);
router.patch("/:id", adminOnly, AmenityController.updateAmenity);
router.delete("/:id", adminOnly, AmenityController.deleteAmenity);

export const AmenityRoutes = router;
