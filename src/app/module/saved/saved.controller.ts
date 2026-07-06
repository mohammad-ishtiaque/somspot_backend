const { default: status } = require("http-status");
import { Request, Response } from "express";
import { SavedService } from "./saved.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const toggleSaved = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await SavedService.toggleSaved(req.user, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: result.saved ? "Business saved" : "Business unsaved", data: result });
});

const getAllSaved = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await SavedService.getAllSaved(req.user, req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Saved businesses retrieved", data: result });
});

const removeSaved = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await SavedService.removeSaved(req.user, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Removed from saved", data: result });
});

const SavedController = { toggleSaved, getAllSaved, removeSaved };

export { SavedController };
