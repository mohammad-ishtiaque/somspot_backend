const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import {
  EnumCampaignStatus,
  EnumPayoutStatus,
  EnumTaskStatus,
} from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Creator from "./Creator";
import Campaign from "../campaign/Campaign";
import CampaignApplication from "./CampaignApplication";
import Earning from "./Earning";
import Payout from "./Payout";

// ---------------- Profile & socials ----------------

const getMyProfile = async (userData: AuthUserPayload) => {
  let profile = await Creator.findOne({ user: userData.userId }).lean();
  if (!profile) {
    const created = await Creator.create({ user: userData.userId });
    profile = created.toObject();
  }
  return profile;
};

const updateProfile = async (userData: AuthUserPayload, payload: { bio?: string }) => {
  const profile = await Creator.findOneAndUpdate(
    { user: userData.userId },
    { $set: { ...(payload.bio !== undefined && { bio: payload.bio }) } },
    { new: true, upsert: true },
  );
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

// ---------------- Campaign marketplace ----------------

const getMarketplace = async (query: QueryParams) => {
  const { meta, result } = await new QueryBuilder(
    Campaign.find({ status: EnumCampaignStatus.LIVE })
      .populate([
        { path: "business", select: "name logo address" },
        { path: "offer", select: "title discountLabel" },
      ])
      .lean(),
    query,
  ).execute(["name"]);
  return { meta, result };
};

const applyToCampaign = async (
  userData: AuthUserPayload,
  payload: { campaignId?: string; pitch?: string },
) => {
  validateFields(payload, ["campaignId"]);
  const campaign = await Campaign.findById(payload.campaignId);
  if (!campaign) throw new ApiError(status.NOT_FOUND, "Campaign not found");
  if (campaign.status !== EnumCampaignStatus.LIVE)
    throw new ApiError(status.BAD_REQUEST, "Campaign is not accepting applications");

  const exists = await CampaignApplication.findOne({
    campaign: campaign._id,
    creator: userData.userId,
  });
  if (exists) throw new ApiError(status.CONFLICT, "You already applied to this campaign");

  return CampaignApplication.create({
    campaign: campaign._id,
    creator: userData.userId,
    pitch: payload.pitch,
  });
};

// ---------------- Creator tasks ----------------

const getMyTasks = async (userData: AuthUserPayload, query: QueryParams) => {
  const base: Record<string, unknown> = { creator: userData.userId };
  if (query.status) base.status = query.status;

  const { meta, result } = await new QueryBuilder(
    CampaignApplication.find(base)
      .populate([{ path: "campaign", select: "name videoLengthSec pricePerClaim business" }])
      .lean(),
    query,
  ).execute([]);
  return { meta, result };
};

const getTask = async (userData: AuthUserPayload, query: { applicationId?: string }) => {
  validateFields(query, ["applicationId"]);
  const task = await CampaignApplication.findById(query.applicationId)
    .populate([{ path: "campaign", select: "name about videoLengthSec pricePerClaim business" }])
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
  payload: { applicationId?: string; draftVideoUrl?: string },
) => {
  validateFields(payload, ["applicationId", "draftVideoUrl"]);
  const application = await findOwnApplication(userData, payload.applicationId!);
  if (application.status !== EnumTaskStatus.APPROVED || application.draftApproved)
    throw new ApiError(status.BAD_REQUEST, "You cannot submit a draft at this stage");

  application.draftVideoUrl = payload.draftVideoUrl;
  application.status = EnumTaskStatus.DRAFT_SUBMITTED;
  application.submittedAt = new Date();
  await application.save();
  return application;
};

// Creator posts the live TikTok/IG URL after the merchant approves the draft.
const submitPostUrl = async (
  userData: AuthUserPayload,
  payload: { applicationId?: string; postUrl?: string },
) => {
  validateFields(payload, ["applicationId", "postUrl"]);
  const application = await findOwnApplication(userData, payload.applicationId!);
  if (!application.draftApproved)
    throw new ApiError(status.BAD_REQUEST, "Your draft has not been approved yet");

  application.postUrl = payload.postUrl;
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
  getMarketplace,
  applyToCampaign,
  getMyTasks,
  getTask,
  submitDraft,
  submitPostUrl,
  getWallet,
  requestPayout,
  getPayouts,
  processPayout,
};

export { CreatorService };
