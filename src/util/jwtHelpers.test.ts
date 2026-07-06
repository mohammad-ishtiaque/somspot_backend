import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { jwtHelpers } from "./jwtHelpers";

describe("jwtHelpers", () => {
  const secret = "unit-test-secret";
  const payload = { authId: "a1", userId: "u1", email: "a@b.com", role: "USER" };

  it("createToken signs a payload that verifyToken can decode", () => {
    const token = jwtHelpers.createToken(payload, secret, "1h");
    const decoded = jwtHelpers.verifyToken<typeof payload>(token, secret);

    expect(decoded.authId).toBe(payload.authId);
    expect(decoded.email).toBe(payload.email);
  });

  it("verifyToken throws for a token signed with a different secret", () => {
    const token = jwtHelpers.createToken(payload, secret, "1h");

    expect(() => jwtHelpers.verifyToken(token, "wrong-secret")).toThrow();
  });

  it("verifyToken throws for an expired token", () => {
    const token = jwt.sign(payload, secret, { expiresIn: -10 });

    expect(() => jwtHelpers.verifyToken(token, secret)).toThrow(
      /jwt expired/,
    );
  });

  it("createResetToken always signs with HS256 regardless of key type", () => {
    const token = jwtHelpers.createResetToken(payload, secret, "10m");
    const header = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString("utf8"),
    );

    expect(header.alg).toBe("HS256");
  });
});
