import { describe, expect, it } from "vitest";
import { t } from "./i18n";

describe("i18n.t", () => {
  it("returns English (identity) for lang=en", () => {
    expect(t("Log in successful", "en")).toBe("Log in successful");
  });
  it("translates a known message to Somali", () => {
    expect(t("Log in successful", "so")).toBe("Si guul leh ayaad u gashay");
  });
  it("translates a known message to Arabic", () => {
    expect(t("Password is incorrect", "ar")).toBe("كلمة المرور غير صحيحة");
  });
  it("falls back to the original string for unknown messages", () => {
    expect(t("some brand new message", "so")).toBe("some brand new message");
  });
  it("falls back to input for an unsupported language", () => {
    expect(t("Log in successful", "fr")).toBe("Log in successful");
  });
  it("handles null/undefined safely", () => {
    expect(t(undefined, "so")).toBe("");
  });
});
