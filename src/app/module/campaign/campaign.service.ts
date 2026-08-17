const { status } = require("http-status");
import { isPrivileged } from "../../../util/authz";
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumCampaignStatus, EnumTaskStatus, EnumUserRole, EnumCategoryType } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Campaign from "./Campaign";
import Business from "../business/Business";
import Auth from "../auth/Auth";
import User from "../user/User";
import Category from "../category/Category";
import Creator from "../creator/Creator";
import CampaignApplication from "../creator/CampaignApplication";
import Earning from "../creator/Earning";
import { SubscriptionService } from "../subscription/subscription.service";

// Fixed platform price per video-length tier (Figma: "Pricing Packages").
// Not merchant-editable — always derived from videoLengthSec.
const VIDEO_LENGTH_PRICE: Record<number, number> = { 20: 5, 30: 7, 45: 10, 60: 15 };
const priceForVideoLength = (sec: number): number => VIDEO_LENGTH_PRICE[sec] ?? VIDEO_LENGTH_PRICE[30];

const assertOwnsCampaign = async (userData: AuthUserPayload, campaignId: string) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new ApiError(status.NOT_FOUND, "Campaign not found");
  if (!isPrivileged(userData.role) && String(campaign.merchant) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your campaign");
  return campaign;
};

// influencerCategory must be a real, active Category doc of type "creator" —
// the same Category collection admin manages for business categories, just
// filtered by type (see Category.ts / EnumCategoryType).
const assertCreatorCategory = async (categoryId: unknown) => {
  if (!categoryId) return;
  const category = await Category.findOne({ _id: categoryId, type: EnumCategoryType.CREATOR }).select("_id");
  if (!category) throw new ApiError(status.BAD_REQUEST, "Invalid influencer category");
};

const createCampaign = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["business", "name"]);

  // Influencer campaigns are a premium (subscription-gated) merchant feature.
  // const entitled = await SubscriptionService.hasActiveEntitlement(userData.userId);
  // if (!entitled && !isPrivileged(userData.role))
  //   throw new ApiError(status.FORBIDDEN, "An active subscription is required to create campaigns");

  const business = await Business.findById(payload.business).select("owner");
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");
  if (!isPrivileged(userData.role) && String(business.owner) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your business");
  await assertCreatorCategory(payload.influencerCategory);

  const videoLengthSec = payload.videoLengthSec ?? 30;

  // Every new campaign waits for admin approval before it can go live.
  return Campaign.create({
    merchant: userData.userId,
    business: payload.business,
    offer: payload.offer,
    name: payload.name,
    about: payload.about,
    goal: payload.goal,
    objective: payload.objective,
    contentType: payload.contentType,
    influencerCategory: payload.influencerCategory,
    startDate: payload.startDate,
    endDate: payload.endDate,
    contentRequirements: payload.contentRequirements,
    invitedCreator: payload.invitedCreator,
    videoLengthSec,
    targetCreators: payload.targetCreators ?? 1,
    pricePerClaim: priceForVideoLength(Number(videoLengthSec)),
    status: EnumCampaignStatus.PENDING_REVIEW,
  });
};

// The Figma admin list has more states than the raw stored `status`: a
// pending_review campaign splits into "pending_approval" / "influencers_assigned"
// depending on staffing, and a live campaign splits into "approved" / "active"
// depending on whether today falls within its date window. None of this is
// stored — derived at read time, same approach as Offer's ACTIVE/SCHEDULED/
// EXPIRED (see offer.service.ts withDerivedStatus).
const deriveDisplayStatus = (
  campaign: { status: string; startDate?: Date | null; endDate?: Date | null; targetCreators: number },
  assignedCount: number,
): string => {
  if (campaign.status === EnumCampaignStatus.PENDING_REVIEW) {
    return assignedCount >= campaign.targetCreators ? "influencers_assigned" : "pending_approval";
  }
  if (campaign.status === EnumCampaignStatus.LIVE) {
    const now = Date.now();
    const afterStart = !campaign.startDate || new Date(campaign.startDate).getTime() <= now;
    const beforeEnd = !campaign.endDate || new Date(campaign.endDate).getTime() >= now;
    return afterStart && beforeEnd ? "active" : "approved";
  }
  return campaign.status; // rejected | paused | completed pass through unchanged
};

// Derived, not stored: budget totals, staffing progress, content progress,
// days left, display status, and the merchant Overview "timeline" stepper
// (Figma: Campaign submitted / Admin approval / Influencers assigned /
// Content review / Published). `applications` is every CampaignApplication
// for the campaign.
const buildCampaignStats = (
  campaign: { targetCreators: number; pricePerClaim: number; startDate?: Date | null; endDate?: Date | null; status: string },
  applications: { status: string }[],
) => {
  const assignedCount = applications.length;
  const neededCreators = Math.max(campaign.targetCreators - assignedCount, 0);
  const totalBudget = campaign.targetCreators * campaign.pricePerClaim;
  const spentBudget = assignedCount * campaign.pricePerClaim;
  const submittedContentCount = applications.filter((a) =>
    [EnumTaskStatus.DRAFT_SUBMITTED, EnumTaskStatus.DRAFT_APPROVED, EnumTaskStatus.VERIFYING, EnumTaskStatus.PUBLISHED].includes(a.status),
  ).length;
  const publishedCount = applications.filter((a) => a.status === EnumTaskStatus.PUBLISHED).length;
  const daysLeft = campaign.endDate
    ? Math.max(Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)), 0)
    : null;
  const displayStatus = deriveDisplayStatus(campaign, assignedCount);

  const stages = [
    { stage: "submitted", done: true },
    { stage: "admin_approval", done: campaign.status !== EnumCampaignStatus.PENDING_REVIEW },
    { stage: "influencers_assigned", done: assignedCount > 0 && assignedCount >= campaign.targetCreators },
    { stage: "content_review", done: assignedCount > 0 && submittedContentCount >= assignedCount },
    { stage: "published", done: assignedCount > 0 && publishedCount >= assignedCount },
  ];
  let currentMarked = false;
  const timeline = stages.map((s) => {
    if (s.done) return { ...s, current: false };
    if (!currentMarked) {
      currentMarked = true;
      return { ...s, current: true };
    }
    return { ...s, current: false };
  });

  return { assignedCount, neededCreators, totalBudget, spentBudget, submittedContentCount, daysLeft, displayStatus, timeline };
};

const getMyCampaigns = async (userData: AuthUserPayload, query: QueryParams) => {
  const { meta, result } = await new QueryBuilder(
    Campaign.find({ merchant: userData.userId })
      .populate([
        {
          path: "business",
          select: "name logo category",
          populate: { path: "category", select: "name slug icon" },
        },
        { path: "influencerCategory", select: "name slug icon" },
      ])
      .lean(),
    query,
  ).execute(["name"]);

  const enriched = await Promise.all(
    result.map(async (c: any) => {
      const applications = await CampaignApplication.find({ campaign: c._id }).select("status").lean();
      return { ...c, ...buildCampaignStats(c, applications) };
    }),
  );

  const [active, inReview] = await Promise.all([
    Campaign.countDocuments({ merchant: userData.userId, status: EnumCampaignStatus.LIVE }),
    Campaign.countDocuments({ merchant: userData.userId, status: EnumCampaignStatus.PENDING_REVIEW }),
  ]);

  return { meta, summary: { active, inReview }, result: enriched };
};

const getCampaign = async (userData: AuthUserPayload, query: { campaignId?: string }) => {
  validateFields(query, ["campaignId"]);
  // Authorization uses the unpopulated lookup — populate() silently resolves
  // a dangling/missing ref to null, which must never affect an ownership check.
  await assertOwnsCampaign(userData, String(query.campaignId));

  const campaign = await Campaign.findById(query.campaignId)
    .populate([
      {
        path: "business",
        select: "name logo address phone category",
        populate: { path: "category", select: "name slug icon" },
      },
      { path: "merchant", select: "name email phoneNumber" },
      { path: "offer", select: "title discountLabel" },
      { path: "invitedCreator", select: "name email" },
      { path: "influencerCategory", select: "name slug icon" },
    ])
    .lean();
  if (!campaign) throw new ApiError(status.NOT_FOUND, "Campaign not found");

  const applications = await CampaignApplication.find({ campaign: campaign._id }).select("status").lean();
  return { ...campaign, ...buildCampaignStats(campaign, applications) };
};

const updateCampaign = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["campaignId"]);
  const campaign = await assertOwnsCampaign(userData, String(payload.campaignId));
  if (payload.influencerCategory !== undefined) await assertCreatorCategory(payload.influencerCategory);

  const fields = ["name", "about", "goal", "objective", "contentType", "influencerCategory", "startDate", "endDate", "contentRequirements", "invitedCreator", "videoLengthSec", "targetCreators", "offer"];
  for (const f of fields) if (payload[f] !== undefined) (campaign as any)[f] = payload[f];
  // pricePerClaim is always derived from videoLengthSec — never merchant-editable.
  if (payload.videoLengthSec !== undefined) campaign.pricePerClaim = priceForVideoLength(Number(payload.videoLengthSec));

  if (payload.status !== undefined) {
    const privileged = isPrivileged(userData.role);
    const merchantAllowed = [EnumCampaignStatus.PAUSED, EnumCampaignStatus.COMPLETED];
    if (!privileged) {
      if (!merchantAllowed.includes(payload.status))
        throw new ApiError(status.FORBIDDEN, "Only an admin can approve or reject a campaign — use campaign/admin/review");
      if (campaign.status !== EnumCampaignStatus.LIVE)
        throw new ApiError(status.BAD_REQUEST, "Campaign must be live to pause or complete it");
    }
    campaign.status = payload.status;
  }

  await campaign.save();
  return campaign;
};

// Admin approves (-> live) or rejects (-> rejected) a campaign submitted for
// review. Approval requires every creator slot to already be filled — the
// admin assigns creators to the still-pending campaign first (assignCreator),
// then approves once fully staffed.
const reviewCampaign = async (payload: { campaignId?: string; action?: string; rejectionReason?: string }) => {
  validateFields(payload, ["campaignId", "action"]);
  const campaign = await Campaign.findById(payload.campaignId);
  if (!campaign) throw new ApiError(status.NOT_FOUND, "Campaign not found");
  if (campaign.status !== EnumCampaignStatus.PENDING_REVIEW)
    throw new ApiError(status.BAD_REQUEST, "Campaign is not pending review");

  if (payload.action === "approve") {
    if (campaign.approvedCount < campaign.targetCreators)
      throw new ApiError(
        status.BAD_REQUEST,
        `Assign all ${campaign.targetCreators} required creators before approving`,
      );
    campaign.status = EnumCampaignStatus.LIVE;
    campaign.rejectionReason = undefined;
  } else if (payload.action === "reject") {
    campaign.status = EnumCampaignStatus.REJECTED;
    campaign.rejectionReason = payload.rejectionReason || "Not specified";
  } else {
    throw new ApiError(status.BAD_REQUEST, "action must be approve or reject");
  }
  await campaign.save();
  return campaign;
};

// Admin directly assigns a creator to a still-pending campaign from their
// dashboard — the task is created already-approved (no self-service
// application step). Assignment happens before final approval (Figma:
// "Assign Influencers" tab + "Approve Campaign (0/5)" on a Pending campaign).
const assignCreator = async (payload: { campaignId?: string; creatorUserId?: string; pitch?: string }) => {
  validateFields(payload, ["campaignId", "creatorUserId"]);
  const campaign = await Campaign.findById(payload.campaignId);
  if (!campaign) throw new ApiError(status.NOT_FOUND, "Campaign not found");
  if (campaign.status !== EnumCampaignStatus.PENDING_REVIEW)
    throw new ApiError(status.BAD_REQUEST, "Creators can only be assigned while the campaign is pending review");
  if (campaign.approvedCount >= campaign.targetCreators)
    throw new ApiError(status.BAD_REQUEST, "All creator slots for this campaign are already filled");

  // `creatorUserId` is the creator's User._id (matches CampaignApplication.creator's
  // "User" ref, and what /creator/admin/list returns) — not their Auth._id.
  const creatorUser = await User.findById(payload.creatorUserId).select("authId");
  if (!creatorUser) throw new ApiError(status.NOT_FOUND, "Creator not found");
  const creatorAuth = await Auth.findById(creatorUser.authId).select("role");
  if (!creatorAuth || creatorAuth.role !== EnumUserRole.CREATOR)
    throw new ApiError(status.NOT_FOUND, "Creator not found");

  const exists = await CampaignApplication.findOne({ campaign: campaign._id, creator: payload.creatorUserId });
  if (exists) throw new ApiError(status.CONFLICT, "This creator is already assigned to this campaign");

  const application = await CampaignApplication.create({
    campaign: campaign._id,
    creator: payload.creatorUserId,
    pitch: payload.pitch,
    status: EnumTaskStatus.APPROVED,
    approvedAt: new Date(),
    commissionAmount: campaign.pricePerClaim,
  });
  await Campaign.updateOne({ _id: campaign._id }, { $inc: { approvedCount: 1 } });
  return application;
};

// Admin "Merchant Campaigns" list (Figma: Offers & Promotions > Merchant
// Campaigns). `status` here is the *derived* display status (pending_approval
// / influencers_assigned / approved / active / rejected / paused / completed),
// not the raw stored one — see deriveDisplayStatus. That means filtering and
// the tab/summary counts happen in memory over the (business/name-narrowed)
// candidate set rather than as a single Mongo query, same tradeoff the
// merchant dashboard already makes for its own aggregate stats.
const adminGetAll = async (query: QueryParams) => {
  const base: Record<string, unknown> = {};
  if (query.business) base.business = query.business;
  if (query.searchTerm) base.name = { $regex: query.searchTerm, $options: "i" };

  const campaigns = await Campaign.find(base)
    .populate([
      {
        path: "business",
        select: "name logo category",
        populate: { path: "category", select: "name slug icon" },
      },
      { path: "merchant", select: "name email phoneNumber" },
      { path: "influencerCategory", select: "name slug icon" },
    ])
    .sort({ createdAt: -1 })
    .lean();

  const campaignIds = campaigns.map((c) => c._id);
  const assignedCounts = await CampaignApplication.aggregate([
    { $match: { campaign: { $in: campaignIds } } },
    { $group: { _id: "$campaign", count: { $sum: 1 } } },
  ]);
  const assignedCountMap = new Map(assignedCounts.map((a) => [String(a._id), a.count]));

  const withStatus = campaigns.map((c: any) => {
    const assignedCount = assignedCountMap.get(String(c._id)) || 0;
    return { ...c, assignedCount, displayStatus: deriveDisplayStatus(c, assignedCount) };
  });

  const summary = {
    total: withStatus.length,
    pendingApproval: withStatus.filter((c) => c.displayStatus === "pending_approval").length,
    influencersAssigned: withStatus.filter((c) => c.displayStatus === "influencers_assigned").length,
    approved: withStatus.filter((c) => c.displayStatus === "approved").length,
    active: withStatus.filter((c) => c.displayStatus === "active").length,
    rejected: withStatus.filter((c) => c.displayStatus === EnumCampaignStatus.REJECTED).length,
    completed: withStatus.filter((c) => c.displayStatus === EnumCampaignStatus.COMPLETED).length,
  };

  const filtered = query.status ? withStatus.filter((c) => c.displayStatus === query.status) : withStatus;

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const result = filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

  return {
    meta: { page, limit, total: filtered.length, totalPage: Math.ceil(filtered.length / limit) || 1 },
    summary,
    result,
  };
};

const deleteCampaign = async (userData: AuthUserPayload, payload: { campaignId?: string }) => {
  validateFields(payload, ["campaignId"]);
  const campaign = await assertOwnsCampaign(userData, String(payload.campaignId));
  await campaign.deleteOne();
  return { deleted: true };
};

// Merchant views the creators admin assigned to their campaign (read-only —
// assignment itself can't be changed from the merchant app).
const getApplications = async (userData: AuthUserPayload, query: QueryParams) => {
  validateFields(query, ["campaignId"]);
  await assertOwnsCampaign(userData, String(query.campaignId));

  // `campaignId` and `hasContent` aren't real CampaignApplication fields
  // (the field is `campaign`, and "has content" isn't stored at all — it's
  // derived from draftVideoUrl below). QueryBuilder's generic filter would
  // otherwise re-apply either verbatim and match nothing. Keep both out of
  // what's passed to QueryBuilder.
  const { campaignId, hasContent, ...listQuery } = query;

  const base: Record<string, unknown> = { campaign: campaignId };
  // The Content tab: status alone can't tell "never submitted" apart from
  // "submitted and already reviewed" (both revert to "approved"), so this
  // filters on the actual presence of a draft instead of status.
  if (hasContent === "true") {
    base.$or = [
      { draftVideo: { $exists: true, $ne: null } },
      { draftVideoUrl: { $exists: true, $ne: null } },
      { thumbnail: { $exists: true, $ne: null } },
    ];
  }

  const { meta, result } = await new QueryBuilder(
    CampaignApplication.find(base)
      .populate([{ path: "creator", select: "name profile_image" }])
      .lean(),
    listQuery,
  ).execute([]);

  // CampaignApplication.creator refs User, not Creator — the niche label
  // (Figma: "Food Creator") lives on the separate Creator profile, so it's
  // merged in with a second lookup rather than a direct populate.
  const creatorUserIds = result.map((r: any) => r.creator?._id).filter(Boolean);
  const profiles = await Creator.find({ user: { $in: creatorUserIds } })
    .select("user category")
    .populate([{ path: "category", select: "name slug icon" }])
    .lean();
  const categoryByUserId = new Map(profiles.map((p: any) => [String(p.user), p.category]));

  const enriched = result.map((r: any) => ({
    ...r,
    creator: r.creator
      ? { ...r.creator, category: categoryByUserId.get(String(r.creator._id)) || null }
      : r.creator,
  }));

  return { meta, result: enriched };
};

// Merchant views one submission's full detail (Figma: tapping a card on the
// Content tab). Same shape/enrichment as one item from getApplications —
// draftVideoUrl/caption/postUrl are only present once the creator has
// actually submitted that stage; a freshly-assigned creator (status
// "approved") legitimately has none of that yet, that's not a missing field.
const getApplication = async (userData: AuthUserPayload, query: { applicationId?: string }) => {
  validateFields(query, ["applicationId"]);
  const application = await CampaignApplication.findById(query.applicationId)
    .populate([{ path: "creator", select: "name profile_image" }])
    .lean();
  if (!application) throw new ApiError(status.NOT_FOUND, "Application not found");
  await assertOwnsCampaign(userData, String(application.campaign));

  const creatorProfile = application.creator
    ? await Creator.findOne({ user: (application.creator as any)._id })
        .select("category")
        .populate([{ path: "category", select: "name slug icon" }])
        .lean()
    : null;

  return {
    ...application,
    creator: application.creator
      ? { ...(application.creator as any), category: creatorProfile?.category || null }
      : application.creator,
  };
};

import postNotification from "../../../util/postNotification";

// Merchant reviews the creator's uploaded draft video.
const reviewDraft = async (
  userData: AuthUserPayload,
  payload: { applicationId?: string; action?: string; merchantNote?: string },
) => {
  validateFields(payload, ["applicationId", "action"]);
  const application = await CampaignApplication.findById(payload.applicationId).populate("campaign", "name");
  if (!application) throw new ApiError(status.NOT_FOUND, "Application not found");
  await assertOwnsCampaign(userData, String(application.campaign?._id || application.campaign));

  if (application.status !== EnumTaskStatus.DRAFT_SUBMITTED)
    throw new ApiError(status.BAD_REQUEST, "No draft awaiting review");

  const campaignName = (application.campaign as any)?.name;

  if (payload.action === "approve") {
    application.draftApproved = true;
    application.merchantNote = payload.merchantNote;
    application.status = EnumTaskStatus.DRAFT_APPROVED; // ready for the creator to post
    postNotification("Draft Approved", `Your draft for campaign ${campaignName} was approved!`, String(application.creator));
  } else if (payload.action === "reject") {
    application.status = EnumTaskStatus.APPROVED; // Reset to approved so creator can resubmit
    application.draftApproved = false;
    application.merchantNote = payload.merchantNote;
    postNotification("Draft Rejected", `Your draft for campaign ${campaignName} needs revisions: ${payload.merchantNote}`, String(application.creator));
  } else {
    throw new ApiError(status.BAD_REQUEST, "action must be approve or reject");
  }
  await application.save();
  return application;
};

// Merchant/admin verifies the live post's engagement -> publishes + pays commission.
const verifyPublication = async (
  userData: AuthUserPayload,
  payload: { applicationId?: string; action?: string },
) => {
  validateFields(payload, ["applicationId", "action"]);
  const application = await CampaignApplication.findById(payload.applicationId);
  if (!application) throw new ApiError(status.NOT_FOUND, "Application not found");
  await assertOwnsCampaign(userData, String(application.campaign));

  if (application.status !== EnumTaskStatus.VERIFYING)
    throw new ApiError(status.BAD_REQUEST, "Nothing to verify");

  if (payload.action === "approve") {
    application.status = EnumTaskStatus.PUBLISHED;
    application.publishedAt = new Date();
    await application.save();

    // Accrue the creator's commission into the earnings ledger.
    await Earning.create({
      creator: application.creator,
      campaign: application.campaign,
      application: application._id,
      amount: application.commissionAmount,
      status: "available",
    });
  } else if (payload.action === "reject") {
    application.status = EnumTaskStatus.REJECTED;
    await application.save();
  } else {
    throw new ApiError(status.BAD_REQUEST, "action must be approve or reject");
  }
  return application;
};

const CampaignService = {
  createCampaign,
  getMyCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  reviewCampaign,
  assignCreator,
  adminGetAll,
  getApplications,
  getApplication,
  reviewDraft,
  verifyPublication,
};

export { CampaignService };
