import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { FavoriteController } from "./favorite.controller";

const router = Router();

const loggedInUser = auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Every favorite route belongs to the logged-in user.
router.get("/", loggedInUser, FavoriteController.getMyFavorites);
router.get("/:propertyId", loggedInUser, FavoriteController.checkFavorite);
router.post("/", loggedInUser, FavoriteController.addFavorite);
router.delete("/:propertyId", loggedInUser, FavoriteController.removeFavorite);

export const FavoriteRoutes = router;
