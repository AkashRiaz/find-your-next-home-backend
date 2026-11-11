import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { uploadImages } from "../../lib/upload";
import { auth } from "../../middleware/checkAuth";
import {
  PROPERTY_IMAGE_UPLOAD_BATCH_MAX,
  PROPERTY_IMAGE_UPLOAD_FIELD,
} from "./propertyImage.constant";
import { PropertyImageController } from "./propertyImage.controller";

// mergeParams gives these routes access to :propertyId from the parent path
// "/api/v1/properties/:propertyId/images".
const router = Router({ mergeParams: true });

const loggedInUser = auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

// "/order" must be registered before "/:imageId", or it is read as an id.

// Owner routes
router.get("/", loggedInUser, PropertyImageController.getPropertyImages);
router.post(
  "/",
  loggedInUser,
  uploadImages(PROPERTY_IMAGE_UPLOAD_FIELD, PROPERTY_IMAGE_UPLOAD_BATCH_MAX),
  PropertyImageController.uploadPropertyImages,
);
router.put("/order", loggedInUser, PropertyImageController.reorderPropertyImages);
router.patch("/:imageId/cover", loggedInUser, PropertyImageController.setCoverImage);
router.patch("/:imageId", loggedInUser, PropertyImageController.updatePropertyImage);
router.delete("/:imageId", loggedInUser, PropertyImageController.deletePropertyImage);

export const PropertyImageRoutes = router;
