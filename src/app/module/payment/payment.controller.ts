import { Request, Response } from "express";
import { PaymentService } from "./payment.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import { QueryParams } from "../../../builder/queryBuilder";

const adminGetAll = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.adminGetAll(req.query as QueryParams);
  sendResponse(res, { statusCode: 200, success: true, message: "Transactions retrieved", data: result });
});

const adminGetOne = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.adminGetOne(req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Transaction retrieved", data: result });
});

const PaymentController = { adminGetAll, adminGetOne };

export { PaymentController };
