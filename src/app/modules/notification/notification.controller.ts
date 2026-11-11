import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { NotificationService } from "./notification.service";
import {
  notificationIdParamsSchema,
  sendSystemNotificationBodySchema,
} from "./notification.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await NotificationService.getMyNotifications(
    user.userId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Notifications fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await NotificationService.getUnreadCount(user.userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Unread count fetched successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { id } = notificationIdParamsSchema.parse(req.params);
  const result = await NotificationService.markAsRead(user.userId, id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await NotificationService.markAllAsRead(user.userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "All notifications marked as read",
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { id } = notificationIdParamsSchema.parse(req.params);
  const result = await NotificationService.deleteNotification(user.userId, id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Notification deleted successfully",
    data: result,
  });
});

const deleteReadNotifications = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as RequestUser;
    const result = await NotificationService.deleteReadNotifications(
      user.userId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Read notifications cleared successfully",
      data: result,
    });
  },
);

const sendSystemNotification = catchAsync(
  async (req: Request, res: Response) => {
    const payload = sendSystemNotificationBodySchema.parse(req.body);
    const result = await NotificationService.sendSystemNotification(payload);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Notification sent successfully",
      data: result,
    });
  },
);

export const NotificationController = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  sendSystemNotification,
};
