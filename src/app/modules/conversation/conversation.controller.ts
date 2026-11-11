import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { ConversationService } from "./conversation.service";
import {
  conversationIdParamsSchema,
  startConversationBodySchema,
} from "./conversation.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const startConversation = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const payload = startConversationBodySchema.parse(req.body);
  const result = await ConversationService.startConversation(user.userId, payload);

  sendResponse(res, {
    success: true,
    statusCode: result.isNew ? httpStatus.CREATED : httpStatus.OK,
    message: result.isNew
      ? "Conversation started successfully"
      : "Conversation already exists",
    data: result.conversation,
  });
});

const getMyConversations = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await ConversationService.getMyConversations(
    user.userId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Conversations fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getUnreadConversationCount = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as RequestUser;
    const result = await ConversationService.getUnreadConversationCount(
      user.userId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Unread conversation count fetched successfully",
      data: result,
    });
  },
);

const getSingleConversation = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { id } = conversationIdParamsSchema.parse(req.params);
  const result = await ConversationService.getSingleConversation(user.userId, id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Conversation fetched successfully",
    data: result,
  });
});

const markConversationAsRead = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as RequestUser;
    const { id } = conversationIdParamsSchema.parse(req.params);
    const result = await ConversationService.markConversationAsRead(
      user.userId,
      id,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Conversation marked as read",
      data: result,
    });
  },
);

export const ConversationController = {
  startConversation,
  getMyConversations,
  getUnreadConversationCount,
  getSingleConversation,
  markConversationAsRead,
};
