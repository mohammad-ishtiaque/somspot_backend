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

const getApplications = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getApplications(getAuthUser(req), req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Applications retrieved", data: result });
});

const reviewApplication = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.reviewApplication(getAuthUser(req), req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Application reviewed", data: result });
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
  getApplications,
  reviewApplication,
  reviewDraft,
  verifyPublication,
};

export { CampaignController };
