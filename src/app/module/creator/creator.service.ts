const { status } = require("http-status");
import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { isPrivileged } from "../../../util/authz";
import {
  EnumCampaignStatus,
  EnumCategoryType,
  EnumContentMediaType,
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
import Claim from "../claim/Claim";
import Notification from "../notification/Notification";

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

// Upserts one social account into a Creator doc in place (same platform =
// update, new platform = add). Marked verified in dev (no external API).
const upsertSocial = (doc: InstanceType<typeof Creator>, social: { platform: string; handle: string; url?: string }) => {
  const existing = doc.socials.find((s) => s.platform === social.platform);
  if (existing) {
    existing.handle = social.handle;
    existing.url = social.url;
    existing.verified = true;
  } else {
    doc.socials.push({ platform: social.platform, handle: social.handle, url: social.url, verified: true });
  }
};

// One call for the whole creator profile: bio/category/stats *and* social
// accounts together, so setup doesn't need a separate request per social
// platform. `socials` is optional and additive — each entry upserts by
// platform, existing platforms not included are left untouched.
const updateProfile = async (
  userData: AuthUserPayload,
  payload: {
    bio?: string;
    category?: string;
    followerCount?: number;
    engagementRate?: number;
    socials?: { platform: string; handle: string; url?: string }[];
  },
) => {
  if (payload.category !== undefined) await assertCreatorCategory(payload.category);

  let doc = await Creator.findOne({ user: userData.userId });
  if (!doc) doc = new Creator({ user: userData.userId });

  if (payload.bio !== undefined) doc.bio = payload.bio;
  if (payload.category !== undefined) doc.category = payload.category as any;
  if (payload.followerCount !== undefined) doc.followerCount = payload.followerCount;
  if (payload.engagementRate !== undefined) doc.engagementRate = payload.engagementRate;
  for (const social of payload.socials || []) {
    validateFields(social, ["platform", "handle"]);
    upsertSocial(doc, social);
  }

  await doc.save();
  await doc.populate([{ path: "category", select: "name slug icon" }]);
  return doc;
};

// Link (or update) a single TikTok/Instagram account on its own — kept for
// incremental updates; PATCH /creator/profile with a `socials` array does
// the same thing alongside the rest of the profile in one call.
const linkSocial = async (
  userData: AuthUserPayload,
  payload: { platform?: string; handle?: string; url?: string },
) => {
  validateFields(payload, ["platform", "handle"]);
  let doc = await Creator.findOne({ user: userData.userId });
  if (!doc) doc = new Creator({ user: userData.userId });

  upsertSocial(doc, payload as { platform: string; handle: string; url?: string });
  await doc.save();
  return doc;
};

// ---------------- Creator tasks ----------------
// Tasks originate from an admin assigning a creator to a live campaign
// (campaign/admin/assign-creator) — there is no self-service marketplace.

const TASK_CAMPAIGN_POPULATE = {
  path: "campaign",
  select: "name about endDate contentType videoLengthSec pricePerClaim business merchant offer",
  populate: [
    { path: "business", select: "name logo" },
    { path: "merchant", select: "name" },
  ],
};

// The 4 Figma tabs (Active/Pending/Completed/Published) don't map 1:1 onto
// the raw `status` enum — both "Active" (not yet submitted) and "Completed"
// (draft approved, ready to post or already posted awaiting verification)
// share status "approved", distinguished only by `draftApproved`. This is
// the same class of bug already fixed on the merchant Content tab (raw
// status alone silently conflates two different UI states).
const deriveTaskStage = (application: { status: string; draftApproved: boolean }) => {
  if (application.status === EnumTaskStatus.PUBLISHED) return "published";
  if (application.status === EnumTaskStatus.REJECTED) return "rejected";
  if (application.status === EnumTaskStatus.DRAFT_SUBMITTED) return "pending";
  if (application.status === EnumTaskStatus.DRAFT_APPROVED) return "live";
  if (application.status === EnumTaskStatus.VERIFYING) return "completed";
  if (application.status === EnumTaskStatus.APPROVED) return "active";
  return application.status;
};

const getMyTasks = async (userData: AuthUserPayload, query: QueryParams) => {
  const tasks = await CampaignApplication.find({ creator: userData.userId })
    .populate([TASK_CAMPAIGN_POPULATE])
    .sort({ createdAt: -1 })
    .lean();

  const withStage = tasks.map((t: any) => ({ ...t, stage: deriveTaskStage(t) }));

  const summary = {
    active: withStage.filter((t) => t.stage === "active").length,
    pending: withStage.filter((t) => t.stage === "pending").length,
    live: withStage.filter((t) => t.stage === "live").length,
    completed: withStage.filter((t) => t.stage === "completed").length,
    published: withStage.filter((t) => t.stage === "published").length,
  };

  const filtered = query.stage
    ? withStage.filter((t) => t.stage === query.stage)
    : query.status
      ? withStage.filter((t) => t.status === query.status)
      : withStage;

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const result = filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

  return {
    meta: { page, limit, total: filtered.length, totalPage: Math.ceil(filtered.length / limit) || 1 },
    summary,
    result,
  };
};

const getTask = async (userData: AuthUserPayload, query: { applicationId?: string }) => {
  validateFields(query, ["applicationId"]);
  const task = await CampaignApplication.findById(query.applicationId)
    .populate([TASK_CAMPAIGN_POPULATE])
    .lean();
  if (!task) throw new ApiError(status.NOT_FOUND, "Task not found");
  if (String(task.creator) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your task");
  return { ...task, stage: deriveTaskStage(task as any) };
};

const findOwnApplication = async (userData: AuthUserPayload, applicationId: string) => {
  const application = await CampaignApplication.findById(applicationId);
  if (!application) throw new ApiError(status.NOT_FOUND, "Task not found");
  if (String(application.creator) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your task");
  return application;
};

// Creator uploads the draft video for merchant approval. `platform` records
// which network this content is for (Figma: the "TikTok Video" badge on the
// Content tab) — nothing else on the record can tell you that reliably.
const submitDraft = async (
  userData: AuthUserPayload,
  payload: {
    applicationId?: string;
    draftVideo?: string;
    draftVideoUrl?: string;
    thumbnail?: string;
    draftMediaType?: string;
    caption?: string;
    platform?: string;
  },
) => {
  validateFields(payload, ["applicationId"]);
  if (!payload.draftVideo && !payload.draftVideoUrl && !payload.thumbnail)
    throw new ApiError(status.BAD_REQUEST, "Either draft video (file or URL) or thumbnail must be provided");

  const application = await findOwnApplication(userData, payload.applicationId!);
  if (application.status !== EnumTaskStatus.APPROVED)
    throw new ApiError(status.BAD_REQUEST, "You cannot submit a draft at this stage");

  if (payload.draftVideo !== undefined) application.draftVideo = payload.draftVideo;
  if (payload.draftVideoUrl !== undefined) application.draftVideoUrl = payload.draftVideoUrl;
  if (payload.thumbnail !== undefined) application.thumbnail = payload.thumbnail;
  application.draftMediaType = payload.draftMediaType || EnumContentMediaType.VIDEO;
  if (payload.caption !== undefined) application.caption = payload.caption;
  if (payload.platform !== undefined) application.platform = payload.platform;
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
  if (application.status !== EnumTaskStatus.DRAFT_APPROVED)
    throw new ApiError(status.BAD_REQUEST, "Your draft has not been approved yet");

  application.postUrl = payload.postUrl;
  if (payload.caption !== undefined) application.caption = payload.caption;
  application.status = EnumTaskStatus.VERIFYING;
  await application.save();
  return application;
};

// ---------------- Earnings & payouts ----------------

// Claims can only be attributed at the campaign-offer level, not to one
// specific creator's post — if a campaign has several assigned creators
// they all share the same offer, and there's no per-creator referral
// tracking. `since` scopes to a window (wallet analytics' period toggle);
// omit it for a lifetime count (dashboard).
const getCreatorClaimsCount = async (userId: string, since?: Date) => {
  const applications = await CampaignApplication.find({ creator: userId }).select("campaign").lean();
  const campaigns = await Campaign.find({ _id: { $in: applications.map((a) => a.campaign) } })
    .select("offer")
    .lean();
  const offerIds = [...new Set(campaigns.map((c) => c.offer).filter(Boolean).map(String))];
  if (!offerIds.length) return 0;

  const match: Record<string, unknown> = { offer: { $in: offerIds } };
  if (since) match.createdAt = { $gte: since };
  return Claim.countDocuments(match);
};

const getWallet = async (userData: AuthUserPayload) => {
  const creatorId = mongoose.Types.ObjectId.createFromHexString(userData.userId);
  const [[agg], [pendingPayoutAgg], recentCommissions] = await Promise.all([
    Earning.aggregate([
      { $match: { creator: creatorId } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, "$amount", 0] } },
          paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] } },
        },
      },
    ]),
    Payout.aggregate([
      { $match: { creator: creatorId, status: EnumPayoutStatus.PENDING } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Earning.find({ creator: userData.userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate([{ path: "campaign", select: "business", populate: { path: "business", select: "name logo" } }])
      .lean(),
  ]);

  return {
    totalEarnings: agg?.total || 0,
    availableBalance: agg?.available || 0,
    paidOut: agg?.paid || 0,
    pendingPayout: pendingPayoutAgg?.total || 0,
    recentCommissions: recentCommissions.map((e: any) => ({
      _id: e._id,
      business: e.campaign?.business?.name || null,
      businessLogo: e.campaign?.business?.logo || null,
      amount: e.amount,
      createdAt: e.createdAt,
    })),
  };
};

// Wallet's "Earnings this period" screen. `period` scopes the headline total
// and the Claims count; the trend chart is always the last 6 months (Figma
// labels it "$ Monthly" regardless of which period pill is selected).
// Total Views / Total Clicks / Top Performing Content are intentionally left
// out — those are TikTok/Instagram metrics with no data source in this app.
const getWalletAnalytics = async (userData: AuthUserPayload, query: { period?: string }) => {
  const period = query.period === "7d" || query.period === "all" ? query.period : "30d";
  const since =
    period === "7d"
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : period === "30d"
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : undefined;

  const creatorId = mongoose.Types.ObjectId.createFromHexString(userData.userId);
  const earningMatch: Record<string, unknown> = { creator: creatorId };
  if (since) earningMatch.createdAt = { $gte: since };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [[periodAgg], claims, trendAgg] = await Promise.all([
    Earning.aggregate([{ $match: earningMatch }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    getCreatorClaimsCount(userData.userId, since),
    Earning.aggregate([
      { $match: { creator: creatorId, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, total: { $sum: "$amount" } } },
    ]),
  ]);
  const trendByMonth = new Map(trendAgg.map((t: any) => [t._id, t.total]));

  const earningsTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    earningsTrend.push({
      month: key,
      label: d.toLocaleString("en-US", { month: "short" }),
      total: trendByMonth.get(key) || 0,
    });
  }

  return {
    period,
    earningsThisPeriod: periodAgg?.total || 0,
    claims,
    earningsTrend,
  };
};

// Home dashboard: greeting/location, lifetime earnings + pending payout,
// lifetime claims, and open tasks (Active + Pending stage only — Completed
// and Published aren't "things to do" so they're left off this screen; see
// GET /creator/tasks?stage= for the full list). One call for the whole screen.
const getDashboard = async (userData: AuthUserPayload) => {
  const creatorId = mongoose.Types.ObjectId.createFromHexString(userData.userId);

  const [user, [earningsAgg], [pendingPayoutAgg], unreadNotifications, claims, openTasksRaw] = await Promise.all([
    User.findById(userData.userId).select("name profile_image address").lean(),
    Earning.aggregate([{ $match: { creator: creatorId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Payout.aggregate([
      { $match: { creator: creatorId, status: EnumPayoutStatus.PENDING } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Notification.countDocuments({ toId: userData.userId, isRead: false }),
    getCreatorClaimsCount(userData.userId),
    CampaignApplication.find({
      creator: userData.userId,
      status: { $in: [EnumTaskStatus.APPROVED, EnumTaskStatus.DRAFT_SUBMITTED, EnumTaskStatus.DRAFT_APPROVED] },
    })
      .populate([TASK_CAMPAIGN_POPULATE])
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  // "Ready for content" (active) vs "Pending merchant review" (pending) —
  // status alone can't tell them apart, same derivation as GET /creator/tasks.
  const activeTasks = openTasksRaw
    .map((t: any) => ({ ...t, stage: deriveTaskStage(t) }))
    .filter((t: any) => t.stage === "active" || t.stage === "pending" || t.stage === "live")
    .slice(0, 5)
    .map((t: any) => ({
      _id: t._id,
      businessName: t.campaign?.business?.name || null,
      campaignName: t.campaign?.name || null,
      stage: t.stage,
      statusLabel: t.stage === "pending" ? "Pending merchant review" : t.stage === "live" ? "Ready to post on social" : "Ready for content",
      // The platform a not-yet-submitted task will target isn't captured
      // anywhere today (it's only set once the creator submits a draft) —
      // null here for "active" tasks is honest, not a bug.
      platform: t.platform || null,
      contentType: t.campaign?.contentType || null,
    }));

  return {
    name: user?.name || null,
    profileImage: user?.profile_image || null,
    location: user?.address || null,
    unreadNotifications,
    totalEarnings: earningsAgg?.total || 0,
    pendingPayout: pendingPayoutAgg?.total || 0,
    claims,
    activeTasks,
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
// the business-detail screen) OR all businesses (consumer home screen feed).
const getBusinessContent = async (query: { businessId?: string }) => {
  const filter: Record<string, unknown> = { status: EnumTaskStatus.PUBLISHED };
  if (query.businessId) {
    const campaigns = await Campaign.find({ business: query.businessId }).select("_id").lean();
    filter.campaign = { $in: campaigns.map((c) => c._id) };
  }

  const content = await CampaignApplication.find(filter)
    .populate([
      { path: "creator", select: "name profile_image" },
      { path: "campaign", select: "name business", populate: { path: "business", select: "name logo" } },
    ])
    .select("postUrl creator campaign publishedAt thumbnail caption platform draftVideoUrl")
    .sort({ publishedAt: -1 })
    .lean();

  return content;
};

// Public: trending creators/influencers for the consumer home page. Supports page/limit pagination & meta.
const getTrendingCreators = async (query: QueryParams) => {
  const queryCopy = { ...query };
  if (!queryCopy.sort) queryCopy.sort = "-followerCount,-engagementRate";

  const { meta, result } = await new QueryBuilder(
    Creator.find()
      .populate([
        { path: "user", select: "name profile_image" },
        { path: "category", select: "name slug icon" },
      ])
      .lean(),
    queryCopy,
  ).execute([]);

  return { meta, result };
};

const CreatorService = {
  getMyProfile,
  updateProfile,
  getBusinessContent,
  getTrendingCreators,
  linkSocial,
  getMyTasks,
  getTask,
  submitDraft,
  submitPostUrl,
  getWallet,
  getWalletAnalytics,
  getDashboard,
  requestPayout,
  getPayouts,
  processPayout,
  adminListCreators,
  adminGetCreatorProfile,
  getAssignedCreatorProfile,
};

export { CreatorService };
