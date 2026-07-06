const { default: status } = require("http-status");
import { Request, Response } from "express";
import { MerchantService } from "./merchant.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const u = (req: Request) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  return req.user;
};

const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getDashboard(u(req));
  sendResponse(res, { statusCode: 200, success: true, message: "Dashboard retrieved", data: result });
});

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getAnalytics(u(req));
  sendResponse(res, { statusCode: 200, success: true, message: "Analytics retrieved", data: result });
});

const getOnboardingStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getOnboardingStatus(u(req), req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Onboarding status retrieved", data: result });
});

const MerchantController = { getDashboard, getAnalytics, getOnboardingStatus };

export { MerchantController };
