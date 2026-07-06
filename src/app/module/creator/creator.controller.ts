const { default: status } = require("http-status");
import { Request, Response } from "express";
import { CreatorService } from "./creator.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const u = (req: Request) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  return req.user;
};

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.getMyProfile(u(req));
  sendResponse(res, { statusCode: 200, success: true, message: "Creator profile retrieved", data: result });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.updateProfile(u(req), req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Profile updated", data: result });
});

const linkSocial = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.linkSocial(u(req), req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Account linked", data: result });
});

const getMarketplace = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.getMarketplace(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Campaigns retrieved", data: result });
});

const applyToCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.applyToCampaign(u(req), req.body);
  sendResponse(res, { statusCode: 201, success: true, message: "Applied to campaign", data: result });
});

const getMyTasks = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.getMyTasks(u(req), req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Tasks retrieved", data: result });
});

const getTask = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.getTask(u(req), req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Task retrieved", data: result });
});

const submitDraft = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.submitDraft(u(req), req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Draft submitted", data: result });
});

const submitPostUrl = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.submitPostUrl(u(req), req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Post submitted for verification", data: result });
});

const getWallet = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.getWallet(u(req));
  sendResponse(res, { statusCode: 200, success: true, message: "Wallet retrieved", data: result });
});

const requestPayout = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.requestPayout(u(req), req.body);
  sendResponse(res, { statusCode: 201, success: true, message: "Payout requested", data: result });
});

const getPayouts = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.getPayouts(u(req), req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Payouts retrieved", data: result });
});

const processPayout = catchAsync(async (req: Request, res: Response) => {
  const result = await CreatorService.processPayout(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Payout processed", data: result });
});

const CreatorController = {
  getMyProfile,
  updateProfile,
  linkSocial,
  getMarketplace,
  applyToCampaign,
  getMyTasks,
  getTask,
  submitDraft,
  submitPostUrl,
  getWallet,
  requestPayout,
  getPayouts,
  processPayout,
};

export { CreatorController };
