import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { MessageService } from "./message.service";
import {
  conversationIdParamsSchema,
  editMessageBodySchema,
  messageIdParamsSchema,
  sendMessageBodySchema,
} from "./message.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { conversationId } = conversationIdParamsSchema.parse(req.params);
  const result = await MessageService.getMessages(
    user.userId,
    conversationId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Messages fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { conversationId } = conversationIdParamsSchema.parse(req.params);
  const payload = sendMessageBodySchema.parse(req.body);
  const result = await MessageService.sendMessage(
    user.userId,
    conversationId,
    payload,
  );

  sendResponse(res, {
    success: true,
    statusCode: result.isNew ? httpStatus.CREATED : httpStatus.OK,
    message: result.isNew ? "Message sent successfully" : "Message already sent",
    data: result.message,
  });
});

const editMessage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { conversationId, messageId } = messageIdParamsSchema.parse(req.params);
  const payload = editMessageBodySchema.parse(req.body);
  const result = await MessageService.editMessage(
    user.userId,
    conversationId,
    messageId,
    payload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Message edited successfully",
    data: result,
  });
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { conversationId, messageId } = messageIdParamsSchema.parse(req.params);
  const result = await MessageService.deleteMessage(
    user.userId,
    conversationId,
    messageId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Message deleted successfully",
    data: result,
  });
});

export const MessageController = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
};
