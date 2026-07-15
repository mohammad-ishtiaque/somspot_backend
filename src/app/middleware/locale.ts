import type { NextFunction, Request, Response } from "express";
import { SUPPORTED_LANGS } from "../../util/i18n";

// Resolves the request language from `x-language` or `accept-language` header.
// Frontend/mobile sends the user's selected language (so | en | ar). Falls back
// to English. Stored on req.language and res.locals.language so both the success
// (sendResponse) and error (globalErrorHandler) paths can localize centrally.
const locale = (req: Request, res: Response, next: NextFunction) => {
  const raw =
    (req.headers["x-language"] as string) ||
    (req.headers["accept-language"] as string) ||
    "en";
  const lang = raw.split(",")[0].trim().slice(0, 2).toLowerCase();
  const resolved = SUPPORTED_LANGS.includes(lang) ? lang : "en";
  req.language = resolved;
  res.locals.language = resolved;
  next();
};

export = locale;
