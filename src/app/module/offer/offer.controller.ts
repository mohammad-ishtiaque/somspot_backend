const { default: status } = require("http-status");
import { Request, Response } from "express";
import { OfferService } from "./offer.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const buildOfferPayload = (req: Request): Record<string, unknown> => {
  const body: Record<string, any> = { ...req.body };
  const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
  if (files.offerImage?.[0]) body.offerImage = files.offerImage[0].path;
  return body;
};

const createOffer = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OfferService.createOffer(req.user, buildOfferPayload(req));
  sendResponse(res, { statusCode: 201, success: true, message: "Offer created", data: result });
});

const getAllOffers = catchAsync(async (req: Request, res: Response) => {
  const result = await OfferService.getAllOffers(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Offers retrieved", data: result });
});

const getOffer = catchAsync(async (req: Request, res: Response) => {
  const result = await OfferService.getOffer(req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Offer retrieved", data: result });
});

const getMyOffers = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OfferService.getMyOffers(req.user, req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Your offers retrieved", data: result });
});

const updateOffer = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OfferService.updateOffer(req.user, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Offer updated", data: result });
});

const deleteOffer = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OfferService.deleteOffer(req.user, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Offer deleted", data: result });
});


const adminGetAll = catchAsync(async (req: Request, res: Response) => {
  const result = await OfferService.adminGetAll(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Offers retrieved", data: result });
});

const OfferController = {
  createOffer,
  getAllOffers,
  getOffer,
  getMyOffers,
  updateOffer,
  deleteOffer,
  adminGetAll,
};

export { OfferController };
