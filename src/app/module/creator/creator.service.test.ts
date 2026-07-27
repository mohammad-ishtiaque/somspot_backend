import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CreatorService } from "./creator.service";
import { CampaignService } from "../campaign/campaign.service";
import Campaign from "../campaign/Campaign";
import Auth from "../auth/Auth";
import User from "../user/User";
import Earning from "./Earning";
import { EnumCampaignStatus, EnumUserRole, EnumCreatorCategory } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const creator = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.CREATOR };

// Creators can only be assigned to a still-pending campaign (assignment
// happens before admin approval — see campaign.service.ts).
const makePendingCampaign = () =>
  Campaign.create({
    merchant: new mongoose.Types.ObjectId(),
    business: new mongoose.Types.ObjectId(),
    name: "BOGO Pizza",
    status: EnumCampaignStatus.PENDING_REVIEW,
    pricePerClaim: 5,
  });

describe("CreatorService", () => {
  it("lists tasks an admin assigned to the creator", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Creator", email: "creator@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Creator", email: "creator@somspot.so" });
    const c = await makePendingCampaign();
    await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creator.userId } as any);
    const { result } = await CreatorService.getMyTasks(creator as any, {});
    expect(result).toHaveLength(1);
  });

  it("aggregates the wallet balance from earnings", async () => {
    await Earning.create({ creator: creator.userId, campaign: new mongoose.Types.ObjectId(), application: new mongoose.Types.ObjectId(), amount: 10, status: "available" });
    await Earning.create({ creator: creator.userId, campaign: new mongoose.Types.ObjectId(), application: new mongoose.Types.ObjectId(), amount: 5, status: "paid" });
    const w = await CreatorService.getWallet(creator as any);
    expect(w.totalEarnings).toBe(15);
    expect(w.availableBalance).toBe(10);
    expect(w.paidOut).toBe(5);
  });

  it("rejects a payout above the available balance", async () => {
    await Earning.create({ creator: creator.userId, campaign: new mongoose.Types.ObjectId(), application: new mongoose.Types.ObjectId(), amount: 10, status: "available" });
    await expect(CreatorService.requestPayout(creator as any, { amount: 50 })).rejects.toThrow();
    const p = await CreatorService.requestPayout(creator as any, { amount: 8 });
    expect(p.amount).toBe(8);
  });

  it("lets a creator self-report category, followers, and engagement rate", async () => {
    const profile = await CreatorService.updateProfile(creator as any, {
      category: EnumCreatorCategory.FOOD,
      followerCount: 50000,
      engagementRate: 4.2,
    });
    expect(profile.category).toBe(EnumCreatorCategory.FOOD);
    expect(profile.followerCount).toBe(50000);
    expect(profile.engagementRate).toBe(4.2);
  });

  it("admin lists creators with a done-count and can filter by category", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Ahmed Hassan", email: "ahmed@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Ahmed Hassan", email: "ahmed@somspot.so" });
    await CreatorService.updateProfile(creator as any, { category: EnumCreatorCategory.FOOD, followerCount: 50000, engagementRate: 4.2 });

    const c = await makePendingCampaign();
    await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creator.userId } as any);

    const { result } = await CreatorService.adminListCreators({ category: EnumCreatorCategory.FOOD });
    expect(result).toHaveLength(1);
    expect((result[0] as any).user.name).toBe("Ahmed Hassan");
    expect(result[0].followerCount).toBe(50000);
    expect((result[0] as any).doneCount).toBe(0); // assigned, not yet published

    const { result: fashionResults } = await CreatorService.adminListCreators({ category: EnumCreatorCategory.FASHION });
    expect(fashionResults).toHaveLength(0);
  });

  it("admin fetches a single creator's profile", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Ahmed Hassan", email: "ahmed@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Ahmed Hassan", email: "ahmed@somspot.so" });
    await CreatorService.updateProfile(creator as any, { category: EnumCreatorCategory.FOOD });

    const profile = await CreatorService.adminGetCreatorProfile({ userId: creator.userId });
    expect(profile.category).toBe(EnumCreatorCategory.FOOD);
    expect((profile as any).doneCount).toBe(0);
  });
});
