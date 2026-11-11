import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PropertyAttributeController } from "./propertyAttribute.controller";

// mergeParams gives these routes access to :propertyId from the parent path
// "/api/v1/properties/:propertyId/attributes".
const router = Router({ mergeParams: true });

const loggedInUser = auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Owner routes
router.get("/", loggedInUser, PropertyAttributeController.getPropertyAttributes);
router.put(
  "/",
  loggedInUser,
  PropertyAttributeController.replacePropertyAttributes,
);
router.put(
  "/:key",
  loggedInUser,
  PropertyAttributeController.upsertPropertyAttribute,
);
router.delete(
  "/:key",
  loggedInUser,
  PropertyAttributeController.deletePropertyAttribute,
);

export const PropertyAttributeRoutes = router;
