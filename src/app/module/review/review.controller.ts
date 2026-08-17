const { default: status } = require("http-status");
import { Request, Response } from "express";
import { ReviewService } from "./review.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const postReview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ReviewService.postReview(req.user, req.body);
  sendResponse(res, { statusCode: 201, success: true, message: "Review posted", data: result });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ReviewService.getAllReviews(req.user, req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Reviews retrieved", data: result });
});

import config from "../../../config";
import { jwtHelpers } from "../../../util/jwtHelpers";
import { AuthUserPayload } from "../../../types/auth.types";

const getBusinessReviews = catchAsync(async (req: Request, res: Response) => {
  let user = req.user;
  if (!user && req.headers.authorization?.startsWith("Bearer ")) {
    try {
      const token = req.headers.authorization.split(" ")[1]?.trim();
      if (token) {
        user = jwtHelpers.verifyToken<AuthUserPayload>(token, config.jwt.secret);
      }
    } catch {
      /* ignore invalid token in optional route */
    }
  }

  const result = await ReviewService.getBusinessReviews(req.query as QueryParams, user);
  sendResponse(res, { statusCode: 200, success: true, message: "Business reviews retrieved", data: result });
});

const toggleHelpful = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ReviewService.toggleHelpful(req.user, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: result.isHelpful ? "Marked as helpful" : "Removed helpful mark", data: result });
});

const getReview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ReviewService.getReview(req.user, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Review retrieved", data: result });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ReviewService.updateReview(req.user, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Review updated", data: result });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ReviewService.deleteReview(req.user, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Review deleted", data: result });
});


const adminModerate = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.adminModerate(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Review moderated", data: result });
});

const ReviewController = {
  postReview,
  getAllReviews,
  getBusinessReviews,
  toggleHelpful,
  getReview,
  updateReview,
  deleteReview,
  adminModerate,
};

export { ReviewController };
