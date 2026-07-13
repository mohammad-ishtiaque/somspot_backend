import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CampaignService } from "./campaign.service";
import Business from "../business/Business";
import Subscription from "../subscription/Subscription";
import CampaignApplication from "../creator/CampaignApplication";
import { EnumBusinessStatus, EnumSubscriptionStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const merchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT };

const setupEntitledMerchant = async () => {
  await Subscription.create({ merchant: merchant.userId, rcAppUserId: merchant.userId, status: EnumSubscriptionStatus.ACTIVE, currentPeriodEnd: new Date(Date.now() + 1e9) });
  return Business.create({ owner: merchant.userId, name: "Shop", category: new mongoose.Types.ObjectId(), status: EnumBusinessStatus.APPROVED });
};

describe("CampaignService", () => {
  it("blocks campaign creation without an active subscription", async () => {
    const b = await Business.create({ owner: merchant.userId, name: "Shop", category: new mongoose.Types.ObjectId() });
    await expect(CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "X" })).rejects.toThrow();
  });

  it("creates a campaign for an entitled merchant", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO", pricePerClaim: 5 });
    expect(c.name).toBe("BOGO");
  });

  it("approves a creator application and sets the commission", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO", pricePerClaim: 7 });
    const app = await CampaignApplication.create({ campaign: c._id, creator: new mongoose.Types.ObjectId() });
    const reviewed = await CampaignService.reviewApplication(merchant as any, { applicationId: String(app._id), action: "approve" });
    expect(reviewed.status).toBe("approved");
    expect(reviewed.commissionAmount).toBe(7);
  });
});
