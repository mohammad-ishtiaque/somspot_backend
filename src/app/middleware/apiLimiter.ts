import rateLimit from "express-rate-limit";
import sendResponse from "../../util/sendResponse";
import { Request, Response } from "express";

// Generous per-IP limit applied to the whole API as a baseline anti-abuse guard.
// Sensitive endpoints (login, OTP) keep the stricter `limiter` on top of this.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: async (req: Request, res: Response) =>
    sendResponse(res, {
      statusCode: 429,
      success: false,
      message: "Too many requests, please slow down",
    }),
});

export = apiLimiter;
