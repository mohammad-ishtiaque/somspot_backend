const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { isPrivileged } from "../../../util/authz";
import {
  EnumCampaignStatus,
  EnumCategoryType,
  EnumPayoutStatus,
  EnumTaskStatus,
} from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Creator from "./Creator";
import Campaign from "../campaign/Campaign";
import CampaignApplication from "./CampaignApplication";
import Category from "../category/Category";
import User from "../user/User";
import Earning from "./Earning";
import Payout from "./Payout";

// ---------------- Profile & socials ----------------

const getMyProfile = async (userData: AuthUserPayload) => {
  let profile = await Creator.findOne({ user: userData.userId })
    .populate([{ path: "category", select: "name slug icon" }])
    .lean();
  if (!profile) {
    const created = await Creator.create({ user: userData.userId });
    profile = created.toObject();
  }
  return profile;
};

// category must be a real, active Category doc of type "creator" — the same
// Category collection admin manages for business categories (see Campaign's
// assertCreatorCategory / Category.ts / EnumCategoryType).
const assertCreatorCategory = async (categoryId: unknown) => {
  if (!categoryId) return;
  const category = await Category.findOne({ _id: categoryId, type: EnumCategoryType.CREATOR }).select("_id");
  if (!category) throw new ApiError(status.BAD_REQUEST, "Invalid creator category");
};

const updateProfile = async (
  userData: AuthUserPayload,
  payload: { bio?: string; category?: string; followerCount?: number; engagementRate?: number },
) => {
  if (payload.category !== undefined) await assertCreatorCategory(payload.category);
  const profile = await Creator.findOneAndUpdate(
    { user: userData.userId },
    {
      $set: {
        ...(payload.bio !== undefined && { bio: payload.bio }),
        ...(payload.category !== undefined && { category: payload.category }),
        ...(payload.followerCount !== undefined && { followerCount: payload.followerCount }),
        ...(payload.engagementRate !== undefined && { engagementRate: payload.engagementRate }),
      },
    },
    { new: true, upsert: true },
  ).populate([{ path: "category", select: "name slug icon" }]);
  return profile;
};

// Link a TikTok/Instagram account. Marked verified in dev (no external API).
const linkSocial = async (
  userData: AuthUserPayload,
  payload: { platform?: string; handle?: string; url?: string },
) => {
  validateFields(payload, ["platform", "handle"]);
  const profile = await Creator.findOne({ user: userData.userId });
  const doc = profile || (await Creator.create({ user: userData.userId }));

  const existing = doc.socials.find((s) => s.platform === payload.platform);
  if (existing) {
    existing.handle = payload.handle!;
    existing.url = payload.url;
    existing.verified = true;
  } else {
    doc.socials.push({
      platform: payload.platform!,
      handle: payload.handle!,
      url: payload.url,
      verified: true,
    });
  }
  await doc.save();
  return doc;
};

// ---------------- Creator tasks ----------------
// Tasks originate from an admin assigning a creator to a live campaign
// (campaign/admin/assign-creator) — there is no self-service marketplace.

const getMyTasks = async (userData: AuthUserPayload, query: QueryParams) => {
  const base: Record<string, unknown> = { creator: userData.userId };
  if (query.status) base.status = query.status;

  const { meta, result } = await new QueryBuilder(
    CampaignApplication.find(base)
      .populate([{
        path: "campaign",
        select: "name videoLengthSec pricePerClaim business",
        populate: { path: "business", select: "name logo" },
      }])
      .lean(),
    query,
  ).execute([]);
  return { meta, result };
};

const getTask = async (userData: AuthUserPayload, query: { applicationId?: string }) => {
  validateFields(query, ["applicationId"]);
  const task = await CampaignApplication.findById(query.applicationId)
    .populate([{
      path: "campaign",
      select: "name about videoLengthSec pricePerClaim business",
      populate: { path: "business", select: "name logo" },
    }])
    .lean();
  if (!task) throw new ApiError(status.NOT_FOUND, "Task not found");
  if (String(task.creator) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your task");
  return task;
};

const findOwnApplication = async (userData: AuthUserPayload, applicationId: string) => {
  const application = await CampaignApplication.findById(applicationId);
  if (!application) throw new ApiError(status.NOT_FOUND, "Task not found");
  if (String(application.creator) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your task");
  return application;
};

// Creator uploads the draft video for merchant approval.
const submitDraft = async (
  userData: AuthUserPayload,
  payload: { applicationId?: string; draftVideoUrl?: string; caption?: string },
) => {
  validateFields(payload, ["applicationId", "draftVideoUrl"]);
  const application = await findOwnApplication(userData, payload.applicationId!);
  if (application.status !== EnumTaskStatus.APPROVED || application.draftApproved)
    throw new ApiError(status.BAD_REQUEST, "You cannot submit a draft at this stage");

  application.draftVideoUrl = payload.draftVideoUrl;
  if (payload.caption !== undefined) application.caption = payload.caption;
  application.status = EnumTaskStatus.DRAFT_SUBMITTED;
  application.submittedAt = new Date();
  await application.save();
  return application;
};

// Creator posts the live TikTok/IG URL after the merchant approves the draft.
// `caption` is optional here too, in case it's tweaked for the live post.
const submitPostUrl = async (
  userData: AuthUserPayload,
  payload: { applicationId?: string; postUrl?: string; caption?: string },
) => {
  validateFields(payload, ["applicationId", "postUrl"]);
  const application = await findOwnApplication(userData, payload.applicationId!);
  if (!application.draftApproved)
    throw new ApiError(status.BAD_REQUEST, "Your draft has not been approved yet");

  application.postUrl = payload.postUrl;
  if (payload.caption !== undefined) application.caption = payload.caption;
  application.status = EnumTaskStatus.VERIFYING;
  await application.save();
  return application;
};

// ---------------- Earnings & payouts ----------------

const getWallet = async (userData: AuthUserPayload) => {
  const [agg] = await Earning.aggregate([
    { $match: { creator: (await import("mongoose")).Types.ObjectId.createFromHexString(userData.userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, "$amount", 0] } },
        paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] } },
      },
    },
  ]);
  const recent = await Earning.find({ creator: userData.userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate([{ path: "campaign", select: "name" }])
    .lean();

  return {
    totalEarnings: agg?.total || 0,
    availableBalance: agg?.available || 0,
    paidOut: agg?.paid || 0,
    recent,
  };
};

const requestPayout = async (
  userData: AuthUserPayload,
  payload: { amount?: number; method?: string; note?: string },
) => {
  validateFields(payload, ["amount"]);
  const amount = Number(payload.amount);
  if (amount <= 0) throw new ApiError(status.BAD_REQUEST, "Amount must be positive");

  const [agg] = await Earning.aggregate([
    { $match: { creator: (await import("mongoose")).Types.ObjectId.createFromHexString(userData.userId), status: "available" } },
    { $group: { _id: null, available: { $sum: "$amount" } } },
  ]);
  const available = agg?.available || 0;
  if (amount > available)
    throw new ApiError(status.BAD_REQUEST, "Amount exceeds available balance");

  // Ledger only — no real transfer rail is wired yet.
  return Payout.create({
    creator: userData.userId,
    amount,
    method: payload.method,
    note: payload.note,
  });
};

const getPayouts = async (userData: AuthUserPayload, query: QueryParams) => {
  const { meta, result } = await new QueryBuilder(
    Payout.find({ creator: userData.userId }).lean(),
    query,
  ).execute([]);
  return { meta, result };
};

// Admin marks a payout paid: flips pending -> paid and settles available earnings.
const processPayout = async (payload: { payoutId?: string; action?: string }) => {
  validateFields(payload, ["payoutId", "action"]);
  const payout = await Payout.findById(payload.payoutId);
  if (!payout) throw new ApiError(status.NOT_FOUND, "Payout not found");
  if (payout.status !== EnumPayoutStatus.PENDING)
    throw new ApiError(status.BAD_REQUEST, "Payout already processed");

  if (payload.action === "reject") {
    payout.status = EnumPayoutStatus.REJECTED;
    payout.processedAt = new Date();
    await payout.save();
    return payout;
  }
  if (payload.action !== "approve")
    throw new ApiError(status.BAD_REQUEST, "action must be approve or reject");

  // Settle oldest available earnings up to the payout amount.
  let remaining = payout.amount;
  const earnings = await Earning.find({ creator: payout.creator, status: "available" }).sort({ createdAt: 1 });
  for (const e of earnings) {
    if (remaining <= 0) break;
    e.status = "paid";
    await e.save();
    remaining -= e.amount;
  }
  payout.status = EnumPayoutStatus.PAID;
  payout.processedAt = new Date();
  await payout.save();
  return payout;
};


// ---------------- Admin: creator discovery ----------------

// Admin browses/searches creators to assign to a campaign (Figma: Assign
// Influencers > Eligible Influencers — name, category, Active/Pending/Done).
// `searchTerm` matches the creator's name, which lives on User, not Creator,
// so it's resolved to a set of user ids before the main query rather than
// going through QueryBuilder's own field-based search.
const adminListCreators = async (query: QueryParams) => {
  const base: Record<string, unknown> = {};
  if (query.category) base.category = query.category;
  if (query.searchTerm) {
    const matchingUsers = await User.find({ name: { $regex: query.searchTerm, $options: "i" } })
      .select("_id")
      .lean();
    base.user = { $in: matchingUsers.map((u) => u._id) };
  }

  const { meta, result } = await new QueryBuilder(
    Creator.find(base)
      .populate([
        { path: "user", select: "name profile_image email" },
        { path: "category", select: "name slug icon" },
      ])
      .lean(),
    query,
  ).execute([]);

  const enriched = await Promise.all(result.map((c: any) => attachTaskCounts(c)));
  return { meta, result: enriched };
};

// Active = has a task on a campaign that's currently live. Pending = has a
// task on a campaign still awaiting admin approval (assigned but not yet
// live). Done = published tasks. Counted by the *linked campaign's* status,
// not the creator's own account state.
const attachTaskCounts = async (creator: any) => {
  const applications = await CampaignApplication.find({ creator: creator.user?._id })
    .populate([{ path: "campaign", select: "status" }])
    .select("status campaign")
    .lean();

  let activeCount = 0;
  let pendingCount = 0;
  let doneCount = 0;
  for (const a of applications as any[]) {
    if (a.status === EnumTaskStatus.PUBLISHED) doneCount++;
    else if (a.campaign?.status === EnumCampaignStatus.LIVE) activeCount++;
    else if (a.campaign?.status === EnumCampaignStatus.PENDING_REVIEW) pendingCount++;
  }

  return { ...creator, activeCount, pendingCount, doneCount };
};

// Admin views one creator's full profile before assigning them.
const adminGetCreatorProfile = async (query: { userId?: string }) => {
  validateFields(query, ["userId"]);
  const profile = await Creator.findOne({ user: query.userId })
    .populate([
      { path: "user", select: "name profile_image email" },
      { path: "category", select: "name slug icon" },
    ])
    .lean();
  if (!profile) throw new ApiError(status.NOT_FOUND, "Creator not found");

  return attachTaskCounts(profile);
};

// Merchant's "View Profile" from the Influencers tab — same shape as the
// admin picker's profile, but scoped: only for a creator actually assigned
// to one of this merchant's own campaigns, not open browsing of any creator.
const getAssignedCreatorProfile = async (userData: AuthUserPayload, query: { userId?: string }) => {
  validateFields(query, ["userId"]);

  if (!isPrivileged(userData.role)) {
    const myCampaigns = await Campaign.find({ merchant: userData.userId }).select("_id").lean();
    const isAssigned = await CampaignApplication.exists({
      campaign: { $in: myCampaigns.map((c) => c._id) },
      creator: query.userId,
    });
    if (!isAssigned)
      throw new ApiError(status.FORBIDDEN, "This creator isn't assigned to any of your campaigns");
  }

  const profile = await Creator.findOne({ user: query.userId })
    .populate([
      { path: "user", select: "name profile_image email" },
      { path: "category", select: "name slug icon" },
    ])
    .lean();
  if (!profile) throw new ApiError(status.NOT_FOUND, "Creator not found");

  return attachTaskCounts(profile);
};

// Public: published creator content for a business (consumer "Creator" tab on
// the business-detail screen — "see what local creators are saying").
const getBusinessContent = async (query: { businessId?: string }) => {
  validateFields(query, ["businessId"]);
  const campaigns = await Campaign.find({ business: query.businessId }).select("_id").lean();
  const campaignIds = campaigns.map((c) => c._id);

  const content = await CampaignApplication.find({
    campaign: { $in: campaignIds },
    status: EnumTaskStatus.PUBLISHED,
  })
    .populate([
      { path: "creator", select: "name profile_image" },
      { path: "campaign", select: "name" },
    ])
    .select("postUrl creator campaign publishedAt")
    .sort({ publishedAt: -1 })
    .lean();

  return content;
};

const CreatorService = {
  getMyProfile,
  updateProfile,
  getBusinessContent,
  linkSocial,
  getMyTasks,
  getTask,
  submitDraft,
  submitPostUrl,
  getWallet,
  requestPayout,
  getPayouts,
  processPayout,
  adminListCreators,
  adminGetCreatorProfile,
  getAssignedCreatorProfile,
};

export { CreatorService };
