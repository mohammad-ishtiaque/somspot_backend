import { Request, Response } from "express";
import { CategoryService } from "./category.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";

const buildCategoryPayload = (req: Request): Record<string, unknown> => {
  const body: Record<string, any> = { ...req.body };
  const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
  if (files.icon?.[0]) body.icon = files.icon[0].path;
  return body;
};

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategory(buildCategoryPayload(req));
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Category created",
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getAllCategories(
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Categories retrieved",
    data: result,
  });
});

const getCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategory(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category retrieved",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.updateCategory(buildCategoryPayload(req));
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category updated",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.deleteCategory(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Category deleted",
    data: result,
  });
});

const CategoryController = {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};

export { CategoryController };
