import type { Response } from "express";
import type { ApiResponse } from "../types/common.types";
import { t } from "./i18n";

const sendResponse = <T>(res: Response, data: ApiResponse<T>): void => {
  const lang = (res.locals && res.locals.language) || "en";
  const responseData = {
    statusCode: data.statusCode,
    success: data.success,
    ...(data.message != null && { message: t(data.message, lang) }),
    ...(data.activationToken != null && {
      activationToken: data.activationToken,
    }),
    ...(data.data != null && { data: data.data }),
  };

  res.status(data.statusCode).json(responseData);
};

export = sendResponse;
