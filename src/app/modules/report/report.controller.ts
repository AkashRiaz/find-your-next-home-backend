import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/rendResponse";
import { ReportService } from "./report.service";
import {
  createReportBodySchema,
  reportIdParamsSchema,
  updateReportStatusBodySchema,
} from "./report.validation";

// Each handler validates its input with Zod; a ZodError is turned into
// a 400 response by the global error handler.

const createReport = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const payload = createReportBodySchema.parse(req.body);
  const result = await ReportService.createReport(user.userId, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Report submitted successfully",
    data: result,
  });
});

const getMyReports = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const result = await ReportService.getMyReports(user.userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Reports fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMySingleReport = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { id } = reportIdParamsSchema.parse(req.params);
  const result = await ReportService.getMySingleReport(user.userId, id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Report fetched successfully",
    data: result,
  });
});

const withdrawReport = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as RequestUser;
  const { id } = reportIdParamsSchema.parse(req.params);
  const result = await ReportService.withdrawReport(user.userId, id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Report withdrawn successfully",
    data: result,
  });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getAllReports(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Reports fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleReport = catchAsync(async (req: Request, res: Response) => {
  const { id } = reportIdParamsSchema.parse(req.params);
  const result = await ReportService.getSingleReport(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Report fetched successfully",
    data: result,
  });
});

const updateReportStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = reportIdParamsSchema.parse(req.params);
  const payload = updateReportStatusBodySchema.parse(req.body);
  const result = await ReportService.updateReportStatus(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Report status updated successfully",
    data: result,
  });
});

export const ReportController = {
  createReport,
  getMyReports,
  getMySingleReport,
  withdrawReport,
  getAllReports,
  getSingleReport,
  updateReportStatus,
};
