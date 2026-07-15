const { default: status } = require("http-status");
import { UserService } from "./user.service";
import { QueryParams } from "../../../builder/queryBuilder";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { Request, Response } from "express";
import ApiError from "../../../error/ApiError";

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateProfile(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const getProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  const result = await UserService.getProfile(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  await UserService.deleteMyAccount(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Account deleted!",
  });
});


const adminGetAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.adminGetAllUsers(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Users retrieved", data: result });
});

const adminGetUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.adminGetUser(req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "User retrieved", data: result });
});

const adminToggleBlock = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.adminToggleBlock(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "User status updated", data: result });
});


const rateApp = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await UserService.rateApp(req.user, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Thanks for rating SomSpot", data: result });
});

const UserController = {
  deleteMyAccount,
  getProfile,
  updateProfile,
  adminGetAllUsers,
  adminGetUser,
  adminToggleBlock,
  rateApp,
};

export { UserController };
