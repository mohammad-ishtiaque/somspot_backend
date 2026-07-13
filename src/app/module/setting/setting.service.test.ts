import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { SettingService } from "./setting.service";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

describe("SettingService", () => {
  it("creates default settings on first access", async () => {
    const s = await SettingService.getSettings();
    expect(s.platformName).toBe("SomSpot");
    expect(s.languages.length).toBe(3);
  });

  it("updates settings", async () => {
    await SettingService.getSettings();
    const s = await SettingService.updateSettings({ commissionPercent: 12, verificationMode: "auto" });
    expect(s.commissionPercent).toBe(12);
    expect(s.verificationMode).toBe("auto");
  });

  it("returns only enabled languages", async () => {
    await SettingService.updateSettings({
      languages: [
        { code: "so", name: "Somali", enabled: true },
        { code: "en", name: "English", enabled: false },
      ],
    });
    const langs = await SettingService.getLanguages();
    expect(langs).toHaveLength(1);
    expect(langs[0].code).toBe("so");
  });
});
