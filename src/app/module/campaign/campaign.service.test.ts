import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CampaignService } from "./campaign.service";
import Business from "../business/Business";
import Subscription from "../subscription/Subscription";
import Auth from "../auth/Auth";
import User from "../user/User";
import Category from "../category/Category";
import { CreatorService } from "../creator/creator.service";
import { EnumBusinessStatus, EnumCampaignStatus, EnumCategoryType, EnumSubscriptionStatus, EnumUserRole } from "../../../util/enum";

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

  it("filters the merchant's campaign list by status (Figma: All / Pending / Approved tabs)", async () => {
    const b = await setupEntitledMerchant();

    // "Pending" — stays pending_review.
    await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "Pending One" });
    await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "Pending Two" });

    // "Approved" — fully staffed and approved to live.
    const approved = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "Sunset Coffee Promotion", targetCreators: 1 });
    const creatorId = await createCreatorAuth();
    await CampaignService.assignCreator({ campaignId: String(approved._id), creatorUserId: creatorId });
    await CampaignService.reviewCampaign({ campaignId: String(approved._id), action: "approve" });

    const all = await CampaignService.getMyCampaigns(merchant as any, {});
    expect(all.result).toHaveLength(3);
    expect(all.summary).toEqual({ active: 1, inReview: 2 });

    // The real stored status is "pending_review"/"live" — there is no
    // literal "approved" status, so the FE's "Approved" tab must query
    // ?status=live, not ?status=approved.
    const pending = await CampaignService.getMyCampaigns(merchant as any, { status: EnumCampaignStatus.PENDING_REVIEW });
    expect(pending.result).toHaveLength(2);
    expect(pending.result.every((c: any) => c.status === EnumCampaignStatus.PENDING_REVIEW)).toBe(true);

    const live = await CampaignService.getMyCampaigns(merchant as any, { status: EnumCampaignStatus.LIVE });
    expect(live.result).toHaveLength(1);
    expect(live.result[0].name).toBe("Sunset Coffee Promotion");
    expect((live.result[0] as any).spentBudget).toBe((live.result[0] as any).totalBudget);

    // A status value that doesn't exist (e.g. the FE naively sending
    // "approved" literally) correctly matches nothing rather than silently
    // returning everything.
    const bogus = await CampaignService.getMyCampaigns(merchant as any, { status: "approved" });
    expect(bogus.result).toHaveLength(0);
  });

  it("derives the admin list's richer status set (Figma: Pending Approval / Influencers Assigned / Approved / Active / Rejected)", async () => {
    const b = await setupEntitledMerchant();
    const DAY = 24 * 60 * 60 * 1000;

    // Pending Approval — nothing assigned yet.
    await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "Ramadan Fashion Campaign", targetCreators: 5 });

    // Influencers Assigned — fully staffed but admin hasn't clicked Approve.
    const staffed = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "Somali Sports Week Promo", targetCreators: 1 });
    await CampaignService.assignCreator({ campaignId: String(staffed._id), creatorUserId: await createCreatorAuth() });

    // Approved — live, but starts in the future.
    const approved = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "Naaso Coffee Brand Awareness", targetCreators: 1, startDate: new Date(Date.now() + 5 * DAY) });
    await CampaignService.assignCreator({ campaignId: String(approved._id), creatorUserId: await createCreatorAuth() });
    await CampaignService.reviewCampaign({ campaignId: String(approved._id), action: "approve" });

    // Active — live and within its date window.
    const active = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "Ramadan Grocery Deals", targetCreators: 1, startDate: new Date(Date.now() - DAY), endDate: new Date(Date.now() + DAY) });
    await CampaignService.assignCreator({ campaignId: String(active._id), creatorUserId: await createCreatorAuth() });
    await CampaignService.reviewCampaign({ campaignId: String(active._id), action: "approve" });

    // Rejected.
    const rejected = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "Summer Beauty Collection", targetCreators: 1 });
    await CampaignService.reviewCampaign({ campaignId: String(rejected._id), action: "reject", rejectionReason: "Not a fit" });

    const all = await CampaignService.adminGetAll({});
    expect(all.summary).toEqual({
      total: 5,
      pendingApproval: 1,
      influencersAssigned: 1,
      approved: 1,
      active: 1,
      rejected: 1,
      completed: 0,
    });

    const byName = (name: string) => all.result.find((c: any) => c.name === name) as any;
    expect(byName("Ramadan Fashion Campaign").displayStatus).toBe("pending_approval");
    expect(byName("Somali Sports Week Promo").displayStatus).toBe("influencers_assigned");
    expect(byName("Naaso Coffee Brand Awareness").displayStatus).toBe("approved");
    expect(byName("Ramadan Grocery Deals").displayStatus).toBe("active");
    expect(byName("Summer Beauty Collection").displayStatus).toBe(EnumCampaignStatus.REJECTED);

    const onlyActive = await CampaignService.adminGetAll({ status: "active" });
    expect(onlyActive.result).toHaveLength(1);
    expect(onlyActive.result[0].name).toBe("Ramadan Grocery Deals");

    const onlyAssigned = await CampaignService.adminGetAll({ status: "influencers_assigned" });
    expect(onlyAssigned.result).toHaveLength(1);
    expect(onlyAssigned.result[0].name).toBe("Somali Sports Week Promo");
  });

  it("includes each assigned creator's category label (Figma: 'Ahmed Hassan • Food Creator')", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO" });

    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Ahmed Hassan", email: "ahmed@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    const creatorUser = await User.create({ authId, name: "Ahmed Hassan", email: "ahmed@somspot.so" });
    const food = await Category.create({ name: "Food", slug: "food", type: EnumCategoryType.CREATOR });
    await CreatorService.updateProfile({ userId: String(creatorUser._id), role: EnumUserRole.CREATOR } as any, { category: String(food._id) });

    await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: String(creatorUser._id) });

    const { result } = await CampaignService.getApplications(merchant as any, { campaignId: String(c._id) });
    expect(result).toHaveLength(1);
    expect((result[0] as any).creator.name).toBe("Ahmed Hassan");
    expect((result[0] as any).creator.category.name).toBe("Food");
  });

  it("fetches one submission's detail — empty content fields before a draft is submitted, filled in after", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO Pizza" });

    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Ahmed Hassan", email: "ahmed@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    const creatorUser = await User.create({ authId, name: "Ahmed Hassan", email: "ahmed@somspot.so" });
    const food = await Category.create({ name: "Food", slug: "food", type: EnumCategoryType.CREATOR });
    await CreatorService.updateProfile({ userId: String(creatorUser._id), role: EnumUserRole.CREATOR } as any, { category: String(food._id) });
    const app = await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: String(creatorUser._id) });

    // Freshly assigned — no content submitted yet, this is expected, not a bug.
    const beforeDraft = await CampaignService.getApplication(merchant as any, { applicationId: String((app as any)._id) });
    expect((beforeDraft as any).status).toBe("approved");
    expect((beforeDraft as any).draftVideoUrl).toBeUndefined();
    expect((beforeDraft as any).creator.name).toBe("Ahmed Hassan");
    expect((beforeDraft as any).creator.category.name).toBe("Food");

    await CreatorService.submitDraft(
      { userId: String(creatorUser._id), role: EnumUserRole.CREATOR } as any,
      {
        applicationId: String((app as any)._id),
        draftVideoUrl: "https://cdn.somspot.so/draft.mp4",
        caption: "Best Pizza in Mogadishu! Buy 1 Get 1 Free today #SomSpot",
      },
    );

    const afterDraft = await CampaignService.getApplication(merchant as any, { applicationId: String((app as any)._id) });
    expect((afterDraft as any).status).toBe("draft_submitted");
    expect((afterDraft as any).draftVideoUrl).toBe("https://cdn.somspot.so/draft.mp4");
    expect((afterDraft as any).caption).toBe("Best Pizza in Mogadishu! Buy 1 Get 1 Free today #SomSpot");

    const otherMerchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT };
    await expect(
      CampaignService.getApplication(otherMerchant as any, { applicationId: String((app as any)._id) }),
    ).rejects.toThrow(/Not your campaign/);
  });

  it("the Content tab (?hasContent=true) includes already-reviewed drafts, not just ones awaiting review", async () => {
    const b = await setupEntitledMerchant();
    const c = await CampaignService.createCampaign(merchant as any, { business: String(b._id), name: "BOGO Pizza", targetCreators: 3 });

    const makeAssignedCreator = async (name: string) => {
      const authId = new mongoose.Types.ObjectId();
      await Auth.create({ _id: authId, name, email: `${name}@somspot.so`, password: "Passw0rd!", role: EnumUserRole.CREATOR });
      const u = await User.create({ authId, name, email: `${name}@somspot.so` });
      const app = await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: String(u._id) });
      return { user: u, app };
    };

    // Never submitted anything — must NOT show up in the Content tab.
    await makeAssignedCreator("NoSubmission");

    // Submitted, still awaiting merchant review — status stays "draft_submitted".
    const pending = await makeAssignedCreator("PendingReview");
    await CreatorService.submitDraft(
      { userId: String(pending.user._id), role: EnumUserRole.CREATOR } as any,
      { applicationId: String((pending.app as any)._id), draftVideoUrl: "https://cdn.somspot.so/pending.mp4" },
    );

    // Submitted AND already reviewed by the merchant — status reverts to
    // "approved" (same value as never-submitted), but the content is still
    // there and must still show up. This is the exact case a plain
    // ?status=draft_submitted filter would incorrectly hide.
    const reviewed = await makeAssignedCreator("AlreadyReviewed");
    await CreatorService.submitDraft(
      { userId: String(reviewed.user._id), role: EnumUserRole.CREATOR } as any,
      { applicationId: String((reviewed.app as any)._id), draftVideoUrl: "https://cdn.somspot.so/reviewed.mp4" },
    );
    await CampaignService.reviewDraft(merchant as any, { applicationId: String((reviewed.app as any)._id), action: "approve" });

    const influencersTab = await CampaignService.getApplications(merchant as any, { campaignId: String(c._id) });
    expect(influencersTab.result).toHaveLength(3); // all assigned creators, content or not

    const contentTab = await CampaignService.getApplications(merchant as any, { campaignId: String(c._id), hasContent: "true" } as any);
    const names = contentTab.result.map((r: any) => r.creator.name).sort();
    expect(names).toEqual(["AlreadyReviewed", "PendingReview"]);

    const reviewedRow = contentTab.result.find((r: any) => r.creator.name === "AlreadyReviewed") as any;
    expect(reviewedRow.status).toBe("approved"); // reverted, but still correctly included
    expect(reviewedRow.draftVideoUrl).toBe("https://cdn.somspot.so/reviewed.mp4");
  });

  it("returns the admin Campaign Info view: merchant contact, business category, and goal", async () => {
    const merchantAuthId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: merchantAuthId, name: "Style House", email: "style@somspot.so", password: "Passw0rd!", role: EnumUserRole.MERCHANT });
    await User.create({ _id: merchant.userId, authId: merchantAuthId, name: "Style House", email: "style@somspot.so", phoneNumber: "+252612345678" });

    const fashionCategory = await Category.create({ name: "Fashion", slug: "fashion", type: EnumCategoryType.MERCHANT });
    const b = await Business.create({ owner: merchant.userId, name: "Style House Mogadishu", category: fashionCategory._id, status: EnumBusinessStatus.APPROVED });

    const c = await CampaignService.createCampaign(merchant as any, {
      business: String(b._id),
      name: "Ramadan Fashion Campaign",
      about: "Showcase our new Ramadan modest fashion collection.",
      goal: "Increase brand awareness and drive sales during the Ramadan season.",
    });

    const detail = await CampaignService.getCampaign(merchant as any, { campaignId: String(c._id) });
    expect((detail as any).merchant.name).toBe("Style House");
    expect((detail as any).merchant.email).toBe("style@somspot.so");
    expect((detail as any).business.name).toBe("Style House Mogadishu");
    expect((detail as any).business.category.name).toBe("Fashion");
    expect(detail.goal).toBe("Increase brand awareness and drive sales during the Ramadan season.");
    expect(detail.about).toBe("Showcase our new Ramadan modest fashion collection.");

    // adminGetAll's list rows need the same populate for the Category column.
    const list = await CampaignService.adminGetAll({});
    const row = list.result.find((r: any) => r.name === "Ramadan Fashion Campaign") as any;
    expect(row.business.category.name).toBe("Fashion");
    expect(row.merchant.name).toBe("Style House");
  });
});
