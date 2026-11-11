import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PropertyController } from "./property.controller";

const router = Router();

const loggedInUser = auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);
const adminOnly = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// "/my" and "/admin" must be registered before "/:id",
// or they are read as an id.
router.get("/my", loggedInUser, PropertyController.getMyProperties);
router.get("/my/:id", loggedInUser, PropertyController.getMySingleProperty);
router.get("/admin", adminOnly, PropertyController.getAllPropertiesForAdmin);

// Public routes
router.get("/", PropertyController.getAllProperties);
router.get("/:id", PropertyController.getSingleProperty);

// Owner routes
router.post("/", loggedInUser, PropertyController.createProperty);
router.patch("/:id/status", loggedInUser, PropertyController.updatePropertyStatus);
router.patch("/:id", loggedInUser, PropertyController.updateProperty);
router.delete("/:id", loggedInUser, PropertyController.deleteProperty);

export const PropertyRoutes = router;
