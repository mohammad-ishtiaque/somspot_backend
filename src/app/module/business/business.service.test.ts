import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { BusinessService } from "./business.service";
import Category from "../category/Category";
import { EnumBusinessStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const merchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT, authId: "x", email: "m@x.co" };
const categoryId = new mongoose.Types.ObjectId().toString();

const createApproved = async () => {
  const b = await BusinessService.createBusiness(merchant as any, { name: "Hilib Macaan", category: categoryId });
  await BusinessService.verifyBusiness({ businessId: String(b._id), action: "approve" });
  return b;
};

describe("BusinessService", () => {
  it("creates a business in pending status", async () => {
    const b = await BusinessService.createBusiness(merchant as any, { name: "Test", category: categoryId });
    expect(b.status).toBe(EnumBusinessStatus.PENDING);
  });

  it("admin approval flips status to approved", async () => {
    const b = await createApproved();
    const detail = await BusinessService.getBusiness(merchant as any, { businessId: String(b._id) });
    expect(detail.status).toBe(EnumBusinessStatus.APPROVED);
  });

  it("public listing only returns approved businesses", async () => {
    await BusinessService.createBusiness(merchant as any, { name: "Pending One", category: categoryId });
    await createApproved();
    const { result } = await BusinessService.getAllBusinesses({});
    expect(result).toHaveLength(1);
  });

  it("hides a pending business from a non-owner", async () => {
    const b = await BusinessService.createBusiness(merchant as any, { name: "Secret", category: categoryId });
    const stranger = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.USER };
    await expect(BusinessService.getBusiness(stranger as any, { businessId: String(b._id) })).rejects.toThrow();
  });

  it("calculates dynamic distance (distanceKm & distanceLabel) when coordinates provided", async () => {
    const b = await BusinessService.createBusiness(merchant as any, {
      name: "Downtown Cafe",
      category: categoryId,
      lat: 2.046934,
      lng: 45.318161,
    });
    await BusinessService.verifyBusiness({ businessId: String(b._id), action: "approve" });

    // Customer at ~1.4 km distance
    const detail = await BusinessService.getBusiness(
      undefined,
      { businessId: String(b._id), lat: "2.055000", lng: "45.325000" },
    );
    expect(detail.distanceKm).toBeGreaterThan(0);
    expect(detail.distanceLabel).toMatch(/km|m/);
  });
});
