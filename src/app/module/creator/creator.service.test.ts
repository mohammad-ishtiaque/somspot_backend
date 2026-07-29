import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CreatorService } from "./creator.service";
import { CampaignService } from "../campaign/campaign.service";
import Campaign from "../campaign/Campaign";
import Auth from "../auth/Auth";
import User from "../user/User";
import Category from "../category/Category";
import Earning from "./Earning";
import { EnumCampaignStatus, EnumUserRole, EnumCategoryType } from "../../../util/enum";

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

const makeCreatorCategory = (name: string) =>
  Category.create({ name, slug: name.toLowerCase(), type: EnumCategoryType.CREATOR });

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
    const food = await makeCreatorCategory("Food");
    const profile = await CreatorService.updateProfile(creator as any, {
      category: String(food._id),
      followerCount: 50000,
      engagementRate: 4.2,
    });
    expect(String(profile.category)).toBe(String(food._id));
    expect(profile.followerCount).toBe(50000);
    expect(profile.engagementRate).toBe(4.2);
  });

  it("rejects a category that doesn't exist or isn't a creator category", async () => {
    const merchantOnly = await Category.create({ name: "Pharmacy", slug: "pharmacy", type: EnumCategoryType.MERCHANT });
    await expect(
      CreatorService.updateProfile(creator as any, { category: String(merchantOnly._id) }),
    ).rejects.toThrow(/Invalid creator category/);
    await expect(
      CreatorService.updateProfile(creator as any, { category: String(new mongoose.Types.ObjectId()) }),
    ).rejects.toThrow(/Invalid creator category/);
  });

  it("admin lists creators, filters by category, and searches by name", async () => {
    const food = await makeCreatorCategory("Food");
    const fashion = await makeCreatorCategory("Fashion");

    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Ahmed Hassan", email: "ahmed@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Ahmed Hassan", email: "ahmed@somspot.so" });
    await CreatorService.updateProfile(creator as any, { category: String(food._id), followerCount: 50000, engagementRate: 4.2 });

    const { result } = await CreatorService.adminListCreators({ category: String(food._id) });
    expect(result).toHaveLength(1);
    expect((result[0] as any).user.name).toBe("Ahmed Hassan");
    expect((result[0] as any).category.name).toBe("Food");
    expect(result[0].followerCount).toBe(50000);

    const { result: fashionResults } = await CreatorService.adminListCreators({ category: String(fashion._id) });
    expect(fashionResults).toHaveLength(0);

    const { result: searchResults } = await CreatorService.adminListCreators({ searchTerm: "Ahmed" });
    expect(searchResults).toHaveLength(1);
    const { result: noMatch } = await CreatorService.adminListCreators({ searchTerm: "Zzzznotfound" });
    expect(noMatch).toHaveLength(0);
  });

  it("counts a creator's tasks as Active/Pending/Done by the linked campaign's status", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Ahmed Hassan", email: "ahmed@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Ahmed Hassan", email: "ahmed@somspot.so" });
    await CreatorService.updateProfile(creator as any, {}); // adminListCreators reads from the Creator collection

    // One task on a campaign still pending review -> "Pending".
    const pending = await makePendingCampaign();
    await CampaignService.assignCreator({ campaignId: String(pending._id), creatorUserId: creator.userId } as any);

    // One task on a campaign that's fully staffed and approved -> "Active".
    // targetCreators defaults to 1, so assigning this one creator is enough to approve it.
    const live = await makePendingCampaign();
    await CampaignService.assignCreator({ campaignId: String(live._id), creatorUserId: creator.userId } as any);
    await CampaignService.reviewCampaign({ campaignId: String(live._id), action: "approve" });

    const { result } = await CreatorService.adminListCreators({});
    expect(result).toHaveLength(1);
    expect((result[0] as any).pendingCount).toBe(1);
    expect((result[0] as any).activeCount).toBe(1);
    expect((result[0] as any).doneCount).toBe(0);
  });

  it("admin fetches a single creator's profile", async () => {
    const food = await makeCreatorCategory("Food");
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Ahmed Hassan", email: "ahmed@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Ahmed Hassan", email: "ahmed@somspot.so" });
    await CreatorService.updateProfile(creator as any, { category: String(food._id) });

    const profile = await CreatorService.adminGetCreatorProfile({ userId: creator.userId });
    expect((profile as any).category.name).toBe("Food");
    expect((profile as any).doneCount).toBe(0);
  });
});
