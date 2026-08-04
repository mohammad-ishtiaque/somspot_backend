import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CreatorService } from "./creator.service";
import { CampaignService } from "../campaign/campaign.service";
import Campaign from "../campaign/Campaign";
import Business from "../business/Business";
import Auth from "../auth/Auth";
import User from "../user/User";
import Category from "../category/Category";
import Earning from "./Earning";
import Payout from "./Payout";
import Offer from "../offer/Offer";
import Claim from "../claim/Claim";
import { EnumCampaignStatus, EnumUserRole, EnumCategoryType, EnumPayoutStatus } from "../../../util/enum";

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

  it("returns the wallet balance plus a pending-payout total and business-labeled recent commissions", async () => {
    const business = await Business.create({ owner: new mongoose.Types.ObjectId(), name: "Somali Tech Store", category: new mongoose.Types.ObjectId() });
    const c = await Campaign.create({
      merchant: new mongoose.Types.ObjectId(),
      business: business._id,
      name: "New iPhone Launch",
      status: EnumCampaignStatus.PENDING_REVIEW,
      pricePerClaim: 5,
    });
    await Earning.create({ creator: creator.userId, campaign: c._id, application: new mongoose.Types.ObjectId(), amount: 20, status: "available" });
    await Payout.create({ creator: creator.userId, amount: 15, status: EnumPayoutStatus.PENDING });
    await Payout.create({ creator: creator.userId, amount: 100, status: EnumPayoutStatus.PAID }); // must not count toward pendingPayout

    const wallet = await CreatorService.getWallet(creator as any);
    expect(wallet.availableBalance).toBe(20);
    expect(wallet.pendingPayout).toBe(15);
    expect(wallet.recentCommissions).toHaveLength(1);
    expect(wallet.recentCommissions[0].business).toBe("Somali Tech Store");
    expect(wallet.recentCommissions[0].amount).toBe(20);
  });

  it("counts claims for a creator's wallet analytics via the campaign's linked offer, scoped by period", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Creator", email: "creator@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Creator", email: "creator@somspot.so" });

    const business = await Business.create({ owner: new mongoose.Types.ObjectId(), name: "Pizza Place", category: new mongoose.Types.ObjectId() });
    const offer = await Offer.create({ business: business._id, title: "BOGO", endAt: new Date(Date.now() + 86400000), createdBy: new mongoose.Types.ObjectId() });
    const c = await Campaign.create({
      merchant: new mongoose.Types.ObjectId(),
      business: business._id,
      offer: offer._id,
      name: "BOGO Pizza",
      status: EnumCampaignStatus.PENDING_REVIEW,
      pricePerClaim: 5,
    });
    await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creator.userId } as any);

    // One claim well within the last 30 days, one deliberately backdated past it.
    await Claim.create({ user: new mongoose.Types.ObjectId(), offer: offer._id, business: business._id, code: "SOM-1", expiresAt: new Date(Date.now() + 86400000) });
    const old = await Claim.create({ user: new mongoose.Types.ObjectId(), offer: offer._id, business: business._id, code: "SOM-2", expiresAt: new Date(Date.now() + 86400000) });
    // Raw driver write, bypassing Mongoose's timestamps middleware, which
    // otherwise re-stamps createdAt back to now on every query-style update.
    await Claim.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) } });

    const monthly = await CreatorService.getWalletAnalytics(creator as any, { period: "30d" });
    expect(monthly.claims).toBe(1);

    const all = await CreatorService.getWalletAnalytics(creator as any, { period: "all" });
    expect(all.claims).toBe(2);
    expect(all.earningsTrend).toHaveLength(6);
  });

  it("serves the home dashboard in one call: profile, earnings, pending payout, and open (active+pending) tasks only", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Abdul Karim", email: "abdul@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Abdul Karim", email: "abdul@somspot.so", address: "Maka Al Mukarama, Mogadishu" });

    // Active: not yet submitted -> "Ready for content".
    const activeCampaign = await makePendingCampaign();
    await CampaignService.assignCreator({ campaignId: String(activeCampaign._id), creatorUserId: creator.userId } as any);

    // Pending: draft submitted -> "Pending merchant review".
    const pendingCampaign = await makePendingCampaign();
    const pendingApp = await CampaignService.assignCreator({ campaignId: String(pendingCampaign._id), creatorUserId: creator.userId } as any);
    await CreatorService.submitDraft(creator as any, { applicationId: String((pendingApp as any)._id), draftVideoUrl: "https://cdn.somspot.so/a.mp4" });

    // Completed: must NOT show up on the dashboard's open-tasks list.
    const completedCampaign = await makePendingCampaign();
    const completedApp = await CampaignService.assignCreator({ campaignId: String(completedCampaign._id), creatorUserId: creator.userId } as any);
    await CreatorService.submitDraft(creator as any, { applicationId: String((completedApp as any)._id), draftVideoUrl: "https://cdn.somspot.so/b.mp4" });
    await CampaignService.reviewDraft(
      { userId: String(completedCampaign.merchant), role: EnumUserRole.MERCHANT } as any,
      { applicationId: String((completedApp as any)._id), action: "approve" },
    );

    await Earning.create({ creator: creator.userId, campaign: activeCampaign._id, application: new mongoose.Types.ObjectId(), amount: 30, status: "paid" });
    await Payout.create({ creator: creator.userId, amount: 10, status: EnumPayoutStatus.PENDING });

    const dashboard = await CreatorService.getDashboard(creator as any);
    expect(dashboard.name).toBe("Abdul Karim");
    expect(dashboard.location).toBe("Maka Al Mukarama, Mogadishu");
    expect(dashboard.totalEarnings).toBe(30);
    expect(dashboard.pendingPayout).toBe(10);
    expect(dashboard.activeTasks).toHaveLength(2);
    const stages = dashboard.activeTasks.map((t: any) => t.stage).sort();
    expect(stages).toEqual(["active", "pending"]);
    const pendingEntry = dashboard.activeTasks.find((t: any) => t.stage === "pending");
    expect(pendingEntry.statusLabel).toBe("Pending merchant review");
    const activeEntry = dashboard.activeTasks.find((t: any) => t.stage === "active");
    expect(activeEntry.statusLabel).toBe("Ready for content");
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
    expect(String((profile.category as any)._id)).toBe(String(food._id));
    expect((profile.category as any).name).toBe("Food");
    expect(profile.followerCount).toBe(50000);
    expect(profile.engagementRate).toBe(4.2);
  });

  it("updates profile fields and social accounts together in one call", async () => {
    const food = await makeCreatorCategory("Food");
    const profile = await CreatorService.updateProfile(creator as any, {
      bio: "I run the biggest food review page in Mogadishu.",
      category: String(food._id),
      followerCount: 50000,
      socials: [
        { platform: "tiktok", handle: "@ahmedeats", url: "https://tiktok.com/@ahmedeats" },
        { platform: "instagram", handle: "@ahmedeats_ig" },
      ],
    });

    expect(profile.bio).toBe("I run the biggest food review page in Mogadishu.");
    expect((profile.category as any).name).toBe("Food");
    expect(profile.socials).toHaveLength(2);
    expect(profile.socials.find((s) => s.platform === "tiktok")?.handle).toBe("@ahmedeats");
    expect(profile.socials.find((s) => s.platform === "instagram")?.verified).toBe(true);

    // A second call updates one platform without disturbing the other or
    // the rest of the profile — same one-endpoint flow, not a full replace.
    const updated = await CreatorService.updateProfile(creator as any, {
      socials: [{ platform: "tiktok", handle: "@ahmedeats_new" }],
    });
    expect(updated.socials).toHaveLength(2);
    expect(updated.socials.find((s) => s.platform === "tiktok")?.handle).toBe("@ahmedeats_new");
    expect(updated.socials.find((s) => s.platform === "instagram")?.handle).toBe("@ahmedeats_ig");
    expect(updated.bio).toBe("I run the biggest food review page in Mogadishu.");
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

  it("populates category on the creator's own profile (get and update)", async () => {
    const food = await makeCreatorCategory("Food");
    const updated = await CreatorService.updateProfile(creator as any, { category: String(food._id) });
    expect((updated as any).category.name).toBe("Food");

    const fetched = await CreatorService.getMyProfile(creator as any);
    expect((fetched as any).category.name).toBe("Food");
  });

  it("accepts an optional caption and platform on submit-draft and submit-post", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Creator", email: "creator@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Creator", email: "creator@somspot.so" });
    const c = await makePendingCampaign();
    const app = await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creator.userId } as any);

    const drafted = await CreatorService.submitDraft(creator as any, {
      applicationId: String((app as any)._id),
      draftVideoUrl: "https://cdn.somspot.so/draft.mp4",
      thumbnail: "uploads/thumbnail/thumb.jpg",
      caption: "Best Pizza in Mogadishu! Buy 1 Get 1 Free today #SomSpot",
      platform: "tiktok",
    });
    expect(drafted.thumbnail).toBe("uploads/thumbnail/thumb.jpg");
    expect(drafted.caption).toBe("Best Pizza in Mogadishu! Buy 1 Get 1 Free today #SomSpot");
    expect(drafted.platform).toBe("tiktok");

    await CampaignService.reviewDraft(
      { userId: String(c.merchant), role: EnumUserRole.MERCHANT } as any,
      { applicationId: String((app as any)._id), action: "approve" },
    );
    const posted = await CreatorService.submitPostUrl(creator as any, {
      applicationId: String((app as any)._id),
      postUrl: "https://tiktok.com/@ahmed/video/1",
      caption: "Updated caption for the live post",
    });
    expect(posted.caption).toBe("Updated caption for the live post");
  });

  it("populates the business name on a creator's tasks", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Creator", email: "creator@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Creator", email: "creator@somspot.so" });

    const business = await Business.create({ owner: new mongoose.Types.ObjectId(), name: "Somali Tech Store", category: new mongoose.Types.ObjectId() });
    const c = await Campaign.create({
      merchant: new mongoose.Types.ObjectId(),
      business: business._id,
      name: "New iPhone Launch",
      status: EnumCampaignStatus.PENDING_REVIEW,
      pricePerClaim: 5,
    });
    const app = await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creator.userId } as any);

    const { result } = await CreatorService.getMyTasks(creator as any, {});
    expect((result[0] as any).campaign.business.name).toBe("Somali Tech Store");

    const task = await CreatorService.getTask(creator as any, { applicationId: String((app as any)._id) });
    expect((task as any).campaign.business.name).toBe("Somali Tech Store");
  });

  it("derives a task's stage from status+draftApproved, distinguishing Active from Completed on the same raw status", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Creator", email: "creator@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Creator", email: "creator@somspot.so" });
    // Active: assigned, never submitted. Raw status "approved", draftApproved false.
    const activeCampaign = await makePendingCampaign();
    const activeApp = await CampaignService.assignCreator({ campaignId: String(activeCampaign._id), creatorUserId: creator.userId } as any);

    // Pending: draft submitted, awaiting merchant review.
    const pendingCampaign = await makePendingCampaign();
    const pendingApp = await CampaignService.assignCreator({ campaignId: String(pendingCampaign._id), creatorUserId: creator.userId } as any);
    await CreatorService.submitDraft(creator as any, { applicationId: String((pendingApp as any)._id), draftVideoUrl: "https://cdn.somspot.so/a.mp4" });

    // Completed: draft approved by merchant, same raw status "approved" as Active — must NOT be classified as Active.
    const completedCampaign = await makePendingCampaign();
    const completedApp = await CampaignService.assignCreator({ campaignId: String(completedCampaign._id), creatorUserId: creator.userId } as any);
    await CreatorService.submitDraft(creator as any, { applicationId: String((completedApp as any)._id), draftVideoUrl: "https://cdn.somspot.so/b.mp4" });
    await CampaignService.reviewDraft(
      { userId: String(completedCampaign.merchant), role: EnumUserRole.MERCHANT } as any,
      { applicationId: String((completedApp as any)._id), action: "approve" },
    );

    // Published: full lifecycle through verification.
    const publishedCampaign = await makePendingCampaign();
    const publishedApp = await CampaignService.assignCreator({ campaignId: String(publishedCampaign._id), creatorUserId: creator.userId } as any);
    await CreatorService.submitDraft(creator as any, { applicationId: String((publishedApp as any)._id), draftVideoUrl: "https://cdn.somspot.so/c.mp4" });
    await CampaignService.reviewDraft(
      { userId: String(publishedCampaign.merchant), role: EnumUserRole.MERCHANT } as any,
      { applicationId: String((publishedApp as any)._id), action: "approve" },
    );
    await CreatorService.submitPostUrl(creator as any, { applicationId: String((publishedApp as any)._id), postUrl: "https://tiktok.com/@ahmed/video/2" });
    await CampaignService.verifyPublication(
      { userId: String(publishedCampaign.merchant), role: EnumUserRole.MERCHANT } as any,
      { applicationId: String((publishedApp as any)._id), action: "approve" },
    );

    const { result, summary } = await CreatorService.getMyTasks(creator as any, {});
    expect(summary).toEqual({ active: 1, pending: 1, completed: 1, published: 1 });

    const byId = new Map(result.map((r: any) => [String(r._id), r.stage]));
    expect(byId.get(String((activeApp as any)._id))).toBe("active");
    expect(byId.get(String((pendingApp as any)._id))).toBe("pending");
    expect(byId.get(String((completedApp as any)._id))).toBe("completed");
    expect(byId.get(String((publishedApp as any)._id))).toBe("published");

    const { result: activeOnly } = await CreatorService.getMyTasks(creator as any, { stage: "active" });
    expect(activeOnly).toHaveLength(1);
    expect((activeOnly[0] as any).stage).toBe("active");

    const task = await CreatorService.getTask(creator as any, { applicationId: String((completedApp as any)._id) });
    expect((task as any).stage).toBe("completed");
  });

  it("lets a merchant view the profile of a creator assigned to their campaign, but not an unrelated one", async () => {
    const merchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT };
    const food = await makeCreatorCategory("Food");

    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Ahmed Hassan", email: "ahmed@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    await User.create({ _id: creator.userId, authId, name: "Ahmed Hassan", email: "ahmed@somspot.so" });
    await CreatorService.updateProfile(creator as any, { category: String(food._id) });

    const c = await Campaign.create({
      merchant: merchant.userId,
      business: new mongoose.Types.ObjectId(),
      name: "Ramadan Fashion Campaign",
      status: EnumCampaignStatus.PENDING_REVIEW,
      pricePerClaim: 5,
    });
    await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creator.userId } as any);

    const profile = await CreatorService.getAssignedCreatorProfile(merchant as any, { userId: creator.userId });
    expect((profile as any).category.name).toBe("Food");

    const otherMerchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT };
    await expect(
      CreatorService.getAssignedCreatorProfile(otherMerchant as any, { userId: creator.userId }),
    ).rejects.toThrow(/isn't assigned to any of your campaigns/);
  });
});
