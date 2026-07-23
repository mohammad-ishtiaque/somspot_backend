import type { NextFunction, Request, Response } from "express";
import { SUPPORTED_LANGS } from "../../util/i18n";

// Resolves the request language, preferring the explicit `language` field the
// client sends in the body/query (this is what forms like registration already
// use to pick the email language) and falling back to the `x-language` or
// `accept-language` header. Falls back to English. Stored on req.language and
// res.locals.language so both the success (sendResponse) and error
// (globalErrorHandler) paths can localize centrally.
const locale = (req: Request, res: Response, next: NextFunction) => {
  const raw =
    (req.body && req.body.language) ||
    (req.query && req.query.language) ||
    (req.headers["x-language"] as string) ||
    (req.headers["accept-language"] as string) ||
    "en";
  const lang = String(raw).split(",")[0].trim().slice(0, 2).toLowerCase();
  const resolved = SUPPORTED_LANGS.includes(lang) ? lang : "en";
  req.language = resolved;
  res.locals.language = resolved;
  next();
};

export = locale;
