const { default: status } = require("http-status");
import { Request, Response } from "express";
import { SearchService } from "./search.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";

const search = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await SearchService.search(req.user, req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Search results", data: result });
});

const getRecent = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await SearchService.getRecent(req.user);
  sendResponse(res, { statusCode: 200, success: true, message: "Recent searches", data: result });
});

const clearRecent = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await SearchService.clearRecent(req.user);
  sendResponse(res, { statusCode: 200, success: true, message: "Recent searches cleared", data: result });
});

const getTrendingSearches = catchAsync(async (_req: Request, res: Response) => {
  const result = await SearchService.getTrendingSearches();
  sendResponse(res, { statusCode: 200, success: true, message: "Trending searches", data: result });
});

const SearchController = { search, getRecent, clearRecent, getTrendingSearches };

export { SearchController };
