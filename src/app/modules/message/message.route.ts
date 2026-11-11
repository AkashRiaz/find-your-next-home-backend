import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { MessageController } from "./message.controller";

// mergeParams gives these routes access to :conversationId from the parent path
// "/api/v1/conversations/:conversationId/messages".
const router = Router({ mergeParams: true });

const loggedInUser = auth(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN);

// Participant routes
router.get("/", loggedInUser, MessageController.getMessages);
router.post("/", loggedInUser, MessageController.sendMessage);
router.patch("/:messageId", loggedInUser, MessageController.editMessage);
router.delete("/:messageId", loggedInUser, MessageController.deleteMessage);

export const MessageRoutes = router;
