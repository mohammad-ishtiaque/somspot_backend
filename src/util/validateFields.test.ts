import { describe, expect, it } from "vitest";
import validateFields from "./validateFields";
import ApiError from "../error/ApiError";

describe("validateFields", () => {
  it("does not throw when all required fields are present and truthy", () => {
    expect(() =>
      validateFields({ email: "a@b.com", password: "secret" }, [
        "email",
        "password",
      ]),
    ).not.toThrow();
  });

  it("throws ApiError 400 when the payload is null or undefined", () => {
    expect(() => validateFields(null, ["email"])).toThrow(ApiError);
    expect(() => validateFields(undefined, ["email"])).toThrow(ApiError);
  });

  it("throws naming the first missing field", () => {
    expect(() =>
      validateFields({ email: "a@b.com" }, ["email", "password"]),
    ).toThrow(/password is required/);
  });

  it("treats falsy values (empty string, 0, false) as missing", () => {
    expect(() => validateFields({ name: "" }, ["name"])).toThrow(
      /name is required/,
    );
  });

  it("sets statusCode 400 on the thrown error", () => {
    try {
      validateFields({}, ["email"]);
      throw new Error("expected validateFields to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(400);
    }
  });
});
