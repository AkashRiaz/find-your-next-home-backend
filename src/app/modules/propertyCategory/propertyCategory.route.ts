import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PropertyCategoryController } from "./propertyCategory.controller";

const router = Router();

const adminOnly = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Admin list must be registered before "/:id", or "admin" is read as an id.
router.get(
  "/admin",
  adminOnly,
  PropertyCategoryController.getAllPropertyCategoriesForAdmin,
);

// Public routes
router.get("/", PropertyCategoryController.getAllPropertyCategories);
router.get("/:id", PropertyCategoryController.getSinglePropertyCategory);

// Admin routes
router.post("/", adminOnly, PropertyCategoryController.createPropertyCategory);
router.patch(
  "/:id/status",
  adminOnly,
  PropertyCategoryController.updatePropertyCategoryStatus,
);
router.patch(
  "/:id",
  adminOnly,
  PropertyCategoryController.updatePropertyCategory,
);
router.delete(
  "/:id",
  adminOnly,
  PropertyCategoryController.deletePropertyCategory,
);

export const PropertyCategoryRoutes = router;
