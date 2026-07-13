import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { ClaimService } from "./claim.service";
import Offer from "../offer/Offer";
import Business from "../business/Business";
import { EnumBusinessStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const user = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.USER };
const merchantId = new mongoose.Types.ObjectId();

const makeOffer = async () => {
  const b = await Business.create({ owner: merchantId, name: "Shop", category: new mongoose.Types.ObjectId(), status: EnumBusinessStatus.APPROVED });
  return Offer.create({ business: b._id, title: "Deal", endAt: new Date(Date.now() + 1e7), createdBy: merchantId, claimLimitPerUser: 1 });
};

describe("ClaimService", () => {
  it("claims an offer and generates a SOM- code", async () => {
    const o = await makeOffer();
    const claim = await ClaimService.claimOffer(user as any, { offerId: String(o._id) });
    expect(claim.code).toMatch(/^SOM-/);
  });

  it("enforces the per-user claim limit", async () => {
    const o = await makeOffer();
    await ClaimService.claimOffer(user as any, { offerId: String(o._id) });
    await expect(ClaimService.claimOffer(user as any, { offerId: String(o._id) })).rejects.toThrow();
  });

  it("lets the merchant redeem a claim by code", async () => {
    const o = await makeOffer();
    const claim = await ClaimService.claimOffer(user as any, { offerId: String(o._id) });
    const merchant = { userId: String(merchantId), role: EnumUserRole.MERCHANT };
    const redeemed = await ClaimService.redeemClaim(merchant as any, { code: claim.code });
    expect(redeemed.status).toBe("redeemed");
  });
});
