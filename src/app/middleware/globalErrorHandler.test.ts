import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { MulterError } from "multer";
import globalErrorHandler from "./globalErrorHandler";
import ApiError from "../../error/ApiError";

const buildRes = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const req = {} as Request;
const next = vi.fn();

describe("globalErrorHandler", () => {
  it("defaults to 500 with a consistent message/errorMessages for a plain Error", () => {
    const res = buildRes();

    globalErrorHandler(new Error("disk is on fire"), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).toBe("disk is on fire");
    expect(body.errorMessages).toEqual([
      { path: "", message: "disk is on fire" },
    ]);
  });

  it("uses the statusCode carried by ApiError", () => {
    const res = buildRes();

    globalErrorHandler(
      new ApiError(404, "Not found"),
      req,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.message).toBe("Not found");
  });

  it("maps Mongoose CastError to 400 with an 'Invalid Id' message", () => {
    const res = buildRes();
    const castError = new mongoose.Error.CastError(
      "ObjectId",
      "not-an-id",
      "userId",
    );

    globalErrorHandler(castError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.errorMessages[0]).toEqual({
      path: "userId",
      message: "Invalid Id",
    });
  });

  it("maps a Mongo duplicate-key error (code 11000) to 409 naming the field", () => {
    const res = buildRes();
    const dupError = Object.assign(new Error("duplicate"), {
      code: 11000,
      keyValue: { email: "a@b.com" },
    });

    globalErrorHandler(dupError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.message).toBe("email must be unique");
  });

  it("maps MulterError (e.g. file too large) to 400 with a friendly message", () => {
    const res = buildRes();
    const multerError = new MulterError("LIMIT_FILE_SIZE", "profile_image");

    globalErrorHandler(multerError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.message).toMatch(/File size exceeds/);
  });

  it("clamps an invalid statusCode (e.g. 0 or 999) back to 500", () => {
    const res = buildRes();

    globalErrorHandler(new ApiError(999, "weird"), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handles non-Error thrown values without crashing", () => {
    const res = buildRes();

    expect(() =>
      globalErrorHandler("just a string" as unknown, req, res, next),
    ).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
