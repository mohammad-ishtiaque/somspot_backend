import { Request, Response } from "express";
import { SettingService } from "./setting.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";

const getSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await SettingService.getSettings();
  sendResponse(res, { statusCode: 200, success: true, message: "Settings retrieved", data: result });
});

const updateSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.updateSettings(req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Settings updated", data: result });
});

const getLanguages = catchAsync(async (_req: Request, res: Response) => {
  const result = await SettingService.getLanguages();
  sendResponse(res, { statusCode: 200, success: true, message: "Languages retrieved", data: result });
});

const SettingController = { getSettings, updateSettings, getLanguages };

export { SettingController };
