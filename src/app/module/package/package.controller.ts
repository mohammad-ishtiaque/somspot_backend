import { Request, Response } from "express";
import { PackageService } from "./package.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";

const getAllPackages = catchAsync(async (req: Request, res: Response) => {
  const result = await PackageService.getAllPackages(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Packages retrieved", data: result });
});

const createPackage = catchAsync(async (req: Request, res: Response) => {
  const result = await PackageService.createPackage(req.body);
  sendResponse(res, { statusCode: 201, success: true, message: "Pricing package created successfully", data: result });
});

const updatePackage = catchAsync(async (req: Request, res: Response) => {
  const result = await PackageService.updatePackage(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Pricing package updated successfully", data: result });
});

const deletePackage = catchAsync(async (req: Request, res: Response) => {
  const packageId = (req.query.packageId as string) || req.body?.packageId;
  const result = await PackageService.deletePackage({ packageId });
  sendResponse(res, { statusCode: 200, success: true, message: "Pricing package deleted successfully", data: result });
});

const PackageController = {
  getAllPackages,
  createPackage,
  updatePackage,
  deletePackage,
};

export { PackageController };
