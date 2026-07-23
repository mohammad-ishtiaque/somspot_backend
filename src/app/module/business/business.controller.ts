const { default: status } = require("http-status");
import { Request, Response } from "express";
import { BusinessService } from "./business.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";


// Merges multipart body + uploaded files into a single business payload.
// JSON-ish fields (openingHours, gallery) may arrive as strings.
const buildBusinessPayload = (req: Request): Record<string, unknown> => {
  const body: Record<string, any> = { ...req.body };
  const files = (req.files || {}) as Record<string, Express.Multer.File[]>;

  for (const key of ["openingHours", "gallery"]) {
    if (typeof body[key] === "string") {
      try {
        body[key] = JSON.parse(body[key]);
      } catch {
        /* leave as-is */
      }
    }
  }
  if (files.logo?.[0]) body.logo = files.logo[0].path;
  if (files.coverImage?.[0]) body.coverImage = files.coverImage[0].path;
  if (files.gallery?.length) body.gallery = files.gallery.map((f) => f.path);
  return body;
};

const createBusiness = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await BusinessService.createBusiness(req.user, buildBusinessPayload(req));
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Business submitted for verification",
    data: result,
  });
});

const getAllBusinesses = catchAsync(async (req: Request, res: Response) => {
  const result = await BusinessService.getAllBusinesses(req.query as QueryParams);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Businesses retrieved",
    data: result,
  });
});

const getTrending = catchAsync(async (req: Request, res: Response) => {
  const result = await BusinessService.getTrending(req.query as QueryParams);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Trending businesses retrieved",
    data: result,
  });
});

const getBusiness = catchAsync(async (req: Request, res: Response) => {
  const result = await BusinessService.getBusiness(req.user, req.query, req.ip);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Business retrieved",
    data: result,
  });
});

const getMyBusinesses = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await BusinessService.getMyBusinesses(req.user, req.query as QueryParams);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Your businesses retrieved",
    data: result,
  });
});

const updateBusiness = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await BusinessService.updateBusiness(req.user, buildBusinessPayload(req));
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Business updated",
    data: result,
  });
});

const verifyBusiness = catchAsync(async (req: Request, res: Response) => {
  const result = await BusinessService.verifyBusiness(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Business verification updated",
    data: result,
  });
});

const deleteBusiness = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await BusinessService.deleteBusiness(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Business deleted",
    data: result,
  });
});


const adminGetAll = catchAsync(async (req: Request, res: Response) => {
  const result = await BusinessService.adminGetAll(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Businesses retrieved", data: result });
});

const BusinessController = {
  createBusiness,
  getAllBusinesses,
  getTrending,
  getBusiness,
  getMyBusinesses,
  updateBusiness,
  verifyBusiness,
  deleteBusiness,
  adminGetAll,
};

export { BusinessController };
