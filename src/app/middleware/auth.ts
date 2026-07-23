import type { NextFunction, Request, Response } from "express";
const httpStatus = require("http-status");
import config from "../../config";
import ApiError from "../../error/ApiError";
import { jwtHelpers } from "../../util/jwtHelpers";
import Auth from "../module/auth/Auth";
import type { AuthUserPayload } from "../../types/auth.types";

const auth =
  (roles: string[], isAccessible = true) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenWithBearer = req.headers.authorization;
      if (!tokenWithBearer && !isAccessible) return next();
      if (!tokenWithBearer) {
        throw new ApiError(
          httpStatus.UNAUTHORIZED,
          "You are not authorized for this role",
        );
      }
      if (!tokenWithBearer.startsWith("Bearer")) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid token format");
      }

      const token = tokenWithBearer.split(" ")[1]?.trim();
      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid token format");
      }

      const verifyUser = jwtHelpers.verifyToken<AuthUserPayload>(
        token,
        config.jwt.secret,
      );
      req.user = verifyUser;

      const isExist = await Auth.findById(verifyUser.authId);
      if (!isExist) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized");
      }

      // This request didn't explicitly ask for a language (see locale
      // middleware) — use the signed-in user's saved preference instead of
      // the accept-language/English default so every route respects it.
      if (res.locals.languageIsDefault && isExist.language) {
        req.language = isExist.language;
        res.locals.language = isExist.language;
      }

      if (roles.length && !roles.includes(verifyUser.role)) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "Access Forbidden: You do not have permission to perform this action",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export = auth;
