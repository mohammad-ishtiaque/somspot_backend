import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CampaignService } from "./campaign.service";
import Business from "../business/Business";
import Subscription from "../subscription/Subscription";
import Auth from "../auth/Auth";
import User from "../user/User";
import { EnumBusinessStatus, EnumCampaignStatus, EnumSubscriptionStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const merchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT };

const setupEntitledMerchant = async () => {
  await Subscription.create({ merchant: merchant.userId, rcAppUserId: merchant.userId, status: EnumSubscriptionStatus.ACTIVE, currentPeriodEnd: new Date(Date.now() + 1e9) });
  return Business.create({ owner: merchant.userId, name: "Shop", category: new mongoose.Types.ObjectId(), status: EnumBusinessStatus.APPROVED });
};

// assignCreator's `creatorUserId` is the creator's User._id, not their Auth._id
// — create both, distinctly, the way real signup does.
const createCreatorAuth = async () => {
  const authId = new mongoose.Types.ObjectId();
  await Auth.create({ _id: authId, name: "Creator", email: `creator-${authId}@somspot.so`, password: "Passw0rd!", role: EnumUserRole.CREATOR });
  const user = await User.create({ authId, name: "Creator", email: `creator-${authId}@somspot.so` });
  return String(user._id);
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

  it("admin assigns a creator to a pending campaign, then approves once fully staffed", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO", videoLengthSec: 30 });

    const creatorId = await createCreatorAuth();
    const app = await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creatorId });
    expect(app.status).toBe("approved");
    expect(app.commissionAmount).toBe(7); // 30s tier

    const approved = await CampaignService.reviewCampaign({ campaignId: String(c._id), action: "approve" });
    expect(approved.status).toBe(EnumCampaignStatus.LIVE);
  });

  it("blocks approval until every required creator slot is filled", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO", targetCreators: 2 });

    const creatorId = await createCreatorAuth();
    await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creatorId });

    await expect(
      CampaignService.reviewCampaign({ campaignId: String(c._id), action: "approve" }),
    ).rejects.toThrow(/Assign all 2 required creators/);
  });

  it("blocks assigning a creator once all slots are filled", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO", targetCreators: 1 });

    const first = await createCreatorAuth();
    await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: first });

    const second = await createCreatorAuth();
    await expect(
      CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: second }),
    ).rejects.toThrow(/already filled/);
  });

  it("blocks assigning a creator to a campaign that is no longer pending review", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO", targetCreators: 1 });

    const first = await createCreatorAuth();
    await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: first });
    await CampaignService.reviewCampaign({ campaignId: String(c._id), action: "approve" });

    const second = await createCreatorAuth();
    await expect(
      CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: second }),
    ).rejects.toThrow(/pending review/);
  });

  it("prevents a merchant from viewing another merchant's campaign", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO" });

    const otherMerchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT };
    await expect(
      CampaignService.getCampaign(otherMerchant as any, { campaignId: String(c._id) }),
    ).rejects.toThrow(/Not your campaign/);

    // The owner can still view it, with computed stats attached.
    const own = await CampaignService.getCampaign(merchant as any, { campaignId: String(c._id) });
    expect(own.assignedCount).toBe(0);
    expect(own.neededCreators).toBe(1);
    expect(own.totalBudget).toBe(own.pricePerClaim * own.targetCreators);
  });

  it("lets an admin view any merchant's campaign", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO" });
    const admin = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.ADMIN };
    const result = await CampaignService.getCampaign(admin as any, { campaignId: String(c._id) });
    expect(String(result._id)).toBe(String(c._id));
  });
});
