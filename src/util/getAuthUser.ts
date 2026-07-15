const { default: status } = require("http-status");
import type { Request } from "express";
import ApiError from "../error/ApiError";
import type { AuthUserPayload } from "../types/auth.types";

// Returns the authenticated user or throws a 401 — replaces the repeated
// `if (!req.user) throw ...` block and per-controller `u(req)` helpers.
const getAuthUser = (req: Request): AuthUserPayload => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  return req.user;
};

export = getAuthUser;
