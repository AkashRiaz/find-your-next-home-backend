import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { NotificationController } from "./notification.controller";

const router = Router();

const loggedInUser = auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);
const adminOnly = auth(UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Static paths ("/unread-count", "/read-all", "/read", "/admin/send") must be
// registered before "/:id", or they are read as an id.

// Admin routes
router.post("/admin/send", adminOnly, NotificationController.sendSystemNotification);

// Recipient routes
router.get("/", loggedInUser, NotificationController.getMyNotifications);
router.get("/unread-count", loggedInUser, NotificationController.getUnreadCount);
router.patch("/read-all", loggedInUser, NotificationController.markAllAsRead);
router.delete("/read", loggedInUser, NotificationController.deleteReadNotifications);
router.patch("/:id/read", loggedInUser, NotificationController.markAsRead);
router.delete("/:id", loggedInUser, NotificationController.deleteNotification);

export const NotificationRoutes = router;
