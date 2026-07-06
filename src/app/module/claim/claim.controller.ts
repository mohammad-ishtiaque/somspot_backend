const { default: status } = require("http-status");
import { Request, Response } from "express";
import { ClaimService } from "./claim.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const claimOffer = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ClaimService.claimOffer(req.user, req.body);
  sendResponse(res, { statusCode: 201, success: true, message: "Offer claimed", data: result });
});

const getWallet = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ClaimService.getWallet(req.user, req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Wallet retrieved", data: result });
});

const getClaim = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ClaimService.getClaim(req.user, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Claim retrieved", data: result });
});

const redeemClaim = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await ClaimService.redeemClaim(req.user, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Claim redeemed", data: result });
});

const ClaimController = { claimOffer, getWallet, getClaim, redeemClaim };

export { ClaimController };
