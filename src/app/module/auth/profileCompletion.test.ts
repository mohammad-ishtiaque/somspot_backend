import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { getProfileCompletion } from "./profileCompletion";
import Business from "../business/Business";
import Creator from "../creator/Creator";
import User from "../user/User";
import { EnumBusinessStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const mkUser = (role: string) => ({ userId: new mongoose.Types.ObjectId().toString(), authId: "a", email: "x@y.co", role });

describe("getProfileCompletion (Option C, strategy per role)", () => {
  it("MERCHANT incomplete without a business", async () => {
    const u = mkUser(EnumUserRole.MERCHANT);
    const r = await getProfileCompletion(u as any);
    expect(r.isProfileComplete).toBe(false);
    expect(r.missing).toContain("business");
  });

  it("MERCHANT complete when the business has all core fields", async () => {
    const u = mkUser(EnumUserRole.MERCHANT);
    await Business.create({
      owner: u.userId, name: "Shop", category: new mongoose.Types.ObjectId(),
      logo: "l.png", phone: "+252...", address: "Mogadishu",
      openingHours: [{ day: 1, open: "09:00", close: "22:00" }],
      status: EnumBusinessStatus.PENDING,
    });
    const r = await getProfileCompletion(u as any);
    expect(r.isProfileComplete).toBe(true);
    expect(r.missing).toHaveLength(0);
  });

  it("CREATOR complete only after linking a social account", async () => {
    const u = mkUser(EnumUserRole.CREATOR);
    expect((await getProfileCompletion(u as any)).isProfileComplete).toBe(false);
    await Creator.create({ user: u.userId, socials: [{ platform: "tiktok", handle: "@x", verified: true }] });
    expect((await getProfileCompletion(u as any)).isProfileComplete).toBe(true);
  });

  it("USER complete only with name + phone", async () => {
    const noPhone = await User.create({ authId: new mongoose.Types.ObjectId(), name: "Ali", email: "a@b.co" });
    const u1 = mkUser(EnumUserRole.USER);
    u1.userId = String(noPhone._id);
    expect((await getProfileCompletion(u1 as any)).missing).toContain("phoneNumber");

    const full = await User.create({ authId: new mongoose.Types.ObjectId(), name: "Sam", email: "s@b.co", phoneNumber: "+252611111111" });
    const u2 = mkUser(EnumUserRole.USER);
    u2.userId = String(full._id);
    expect((await getProfileCompletion(u2 as any)).isProfileComplete).toBe(true);
  });

  it("ADMIN is always complete", async () => {
    const r = await getProfileCompletion(mkUser(EnumUserRole.ADMIN) as any);
    expect(r.isProfileComplete).toBe(true);
  });
});
