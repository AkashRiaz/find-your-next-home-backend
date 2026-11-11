import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { ConversationController } from "./conversation.controller";

const router = Router();

const loggedInUser = auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

// "/unread-count" must be registered before "/:id", or it is read as an id.

// Participant routes
router.post("/", loggedInUser, ConversationController.startConversation);
router.get("/", loggedInUser, ConversationController.getMyConversations);
router.get(
  "/unread-count",
  loggedInUser,
  ConversationController.getUnreadConversationCount,
);
router.get("/:id", loggedInUser, ConversationController.getSingleConversation);
router.patch("/:id/read", loggedInUser, ConversationController.markConversationAsRead);

export const ConversationRoutes = router;
