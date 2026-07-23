import type { NextFunction, Request, Response } from "express";
import { SUPPORTED_LANGS } from "../../util/i18n";

const normalize = (raw: unknown): string | null => {
  if (!raw) return null;
  const lang = String(raw).split(",")[0].trim().slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(lang) ? lang : null;
};

// A request explicitly asking for a language wins: body/query `language`
// (what registration/OTP forms send) or the `x-language` header (an app
// deliberately switching language for this call).
const resolveExplicitLanguage = (req: Request): string | null =>
  normalize(req.body && req.body.language) ||
  normalize(req.query && req.query.language) ||
  normalize(req.headers["x-language"]);

// Resolves the request language for this call. If nothing explicit was sent,
// falls back to the `accept-language` header / English, but flags the result
// as a default so the `auth` middleware can still override it with the
// signed-in user's saved language preference (Auth.language) once it knows
// who's calling. Stored on req.language and res.locals.language so both the
// success (sendResponse) and error (globalErrorHandler) paths can localize
// centrally.
const locale = (req: Request, res: Response, next: NextFunction) => {
  const explicit = resolveExplicitLanguage(req);
  const resolved = explicit || normalize(req.headers["accept-language"]) || "en";
  req.language = resolved;
  res.locals.language = resolved;
  res.locals.languageIsDefault = !explicit;
  next();
};

export = locale;
