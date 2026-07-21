const { default: status } = require("http-status");
import { Request, Response } from "express";
import { CampaignService } from "./campaign.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import getAuthUser from "../../../util/getAuthUser";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const createCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.createCampaign(getAuthUser(req), req.body);
  sendResponse(res, { statusCode: 201, success: true, message: "Campaign created", data: result });
});

const getMyCampaigns = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getMyCampaigns(getAuthUser(req), req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Campaigns retrieved", data: result });
});

const getCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getCampaign(req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Campaign retrieved", data: result });
});

const updateCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.updateCampaign(getAuthUser(req), req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Campaign updated", data: result });
});

const deleteCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.deleteCampaign(getAuthUser(req), req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Campaign deleted", data: result });
});

const reviewCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.reviewCampaign(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Campaign reviewed", data: result });
});

const assignCreator = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.assignCreator(req.body);
  sendResponse(res, { statusCode: 201, success: true, message: "Creator assigned", data: result });
});

const adminGetAll = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.adminGetAll(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Campaigns retrieved", data: result });
});

const getApplications = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getApplications(getAuthUser(req), req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Applications retrieved", data: result });
});

const reviewDraft = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.reviewDraft(getAuthUser(req), req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Draft reviewed", data: result });
});

const verifyPublication = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.verifyPublication(getAuthUser(req), req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Publication verified", data: result });
});

const CampaignController = {
  createCampaign,
  getMyCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  reviewCampaign,
  assignCreator,
  adminGetAll,
  getApplications,
  reviewDraft,
  verifyPublication,
};

export { CampaignController };
