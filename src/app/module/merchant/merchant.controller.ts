const { default: status } = require("http-status");
import { Request, Response } from "express";
import { MerchantService } from "./merchant.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import getAuthUser from "../../../util/getAuthUser";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getDashboard(getAuthUser(req));
  sendResponse(res, { statusCode: 200, success: true, message: "Dashboard retrieved", data: result });
});

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getAnalytics(getAuthUser(req));
  sendResponse(res, { statusCode: 200, success: true, message: "Analytics retrieved", data: result });
});

const getOnboardingStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.getOnboardingStatus(getAuthUser(req), req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Onboarding status retrieved", data: result });
});


const adminGetMerchants = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.adminGetMerchants(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Merchants retrieved", data: result });
});

const adminGetMerchant = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.adminGetMerchant(req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Merchant retrieved", data: result });
});

const adminToggleBlockMerchant = catchAsync(async (req: Request, res: Response) => {
  const result = await MerchantService.adminToggleBlockMerchant(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Merchant status updated", data: result });
});

const MerchantController = {
  getDashboard,
  getAnalytics,
  getOnboardingStatus,
  adminGetMerchants,
  adminGetMerchant,
  adminToggleBlockMerchant,
};

export { MerchantController };
