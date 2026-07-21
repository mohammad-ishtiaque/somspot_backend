import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CampaignService } from "./campaign.service";
import Business from "../business/Business";
import Subscription from "../subscription/Subscription";
import Auth from "../auth/Auth";
import { EnumBusinessStatus, EnumCampaignStatus, EnumSubscriptionStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const merchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT };

const setupEntitledMerchant = async () => {
  await Subscription.create({ merchant: merchant.userId, rcAppUserId: merchant.userId, status: EnumSubscriptionStatus.ACTIVE, currentPeriodEnd: new Date(Date.now() + 1e9) });
  return Business.create({ owner: merchant.userId, name: "Shop", category: new mongoose.Types.ObjectId(), status: EnumBusinessStatus.APPROVED });
};

describe("CampaignService", () => {
  it("creates a campaign pending review, with price derived from videoLengthSec", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO", videoLengthSec: 45 });
    expect(c.name).toBe("BOGO");
    expect(c.status).toBe(EnumCampaignStatus.PENDING_REVIEW);
    expect(c.pricePerClaim).toBe(10); // 45s tier
  });

  it("blocks a merchant from setting status directly to live", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO" });
    await expect(
      CampaignService.updateCampaign(merchant as any, { campaignId: String(c._id), status: "live" }),
    ).rejects.toThrow();
  });

  it("admin approves a pending campaign, then assigns a creator with the derived commission", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO", videoLengthSec: 30 });

    const approved = await CampaignService.reviewCampaign({ campaignId: String(c._id), action: "approve" });
    expect(approved.status).toBe(EnumCampaignStatus.LIVE);

    const creatorId = new mongoose.Types.ObjectId().toString();
    await Auth.create({ _id: creatorId, name: "Creator", email: "creator2@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });

    const app = await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creatorId });
    expect(app.status).toBe("approved");
    expect(app.commissionAmount).toBe(7); // 30s tier
  });
});
