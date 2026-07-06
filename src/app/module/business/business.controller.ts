const { default: status } = require("http-status");
import { Request, Response } from "express";
import { BusinessService } from "./business.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const createBusiness = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await BusinessService.createBusiness(req.user, req.body);
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
  const result = await BusinessService.getBusiness(req.user, req.query);
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
  const result = await BusinessService.updateBusiness(req.user, req.body);
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
