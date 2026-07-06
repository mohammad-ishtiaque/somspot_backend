const { default: status } = require("http-status");
import { Request, Response } from "express";
import config from "../../../config";
import { SubscriptionService } from "./subscription.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const getPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = await SubscriptionService.getPlans();
  sendResponse(res, { statusCode: 200, success: true, message: "Plans retrieved", data: result });
});

const getMySubscription = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await SubscriptionService.getMySubscription(req.user);
  sendResponse(res, { statusCode: 200, success: true, message: "Subscription retrieved", data: result });
});

// RevenueCat webhook. Authenticated via the shared Authorization header secret.
const webhook = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (config.revenuecat.webhook_auth && authHeader !== config.revenuecat.webhook_auth)
    throw new ApiError(status.UNAUTHORIZED, "Invalid webhook signature");
  const result = await SubscriptionService.handleWebhook(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Webhook processed", data: result });
});


const adminGetAll = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.adminGetAll(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Subscriptions retrieved", data: result });
});

const SubscriptionController = {
  getPlans,
  getMySubscription,
  webhook,
  adminGetAll,
};

export { SubscriptionController };
