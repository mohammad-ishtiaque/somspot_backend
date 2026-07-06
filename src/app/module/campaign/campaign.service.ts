const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumCampaignStatus, EnumTaskStatus, EnumUserRole } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Campaign from "./Campaign";
import Business from "../business/Business";
import CampaignApplication from "../creator/CampaignApplication";
import Earning from "../creator/Earning";
import { SubscriptionService } from "../subscription/subscription.service";

const isPrivileged = (role: string) =>
  role === EnumUserRole.ADMIN || role === EnumUserRole.SUPER_ADMIN;

const assertOwnsCampaign = async (userData: AuthUserPayload, campaignId: string) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new ApiError(status.NOT_FOUND, "Campaign not found");
  if (!isPrivileged(userData.role) && String(campaign.merchant) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your campaign");
  return campaign;
};

const createCampaign = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["business", "name"]);

  // Influencer campaigns are a premium (subscription-gated) merchant feature.
  const entitled = await SubscriptionService.hasActiveEntitlement(userData.userId);
  if (!entitled && !isPrivileged(userData.role))
    throw new ApiError(status.FORBIDDEN, "An active subscription is required to create campaigns");

  const business = await Business.findById(payload.business).select("owner");
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");
  if (!isPrivileged(userData.role) && String(business.owner) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your business");

  return Campaign.create({
    merchant: userData.userId,
    business: payload.business,
    offer: payload.offer,
    name: payload.name,
    about: payload.about,
    videoLengthSec: payload.videoLengthSec ?? 30,
    targetCreators: payload.targetCreators ?? 1,
    pricePerClaim: payload.pricePerClaim ?? 0,
  });
};

const getMyCampaigns = async (userData: AuthUserPayload, query: QueryParams) => {
  const campaignQuery = new QueryBuilder(
    Campaign.find({ merchant: userData.userId })
      .populate([{ path: "business", select: "name logo" }])
      .lean(),
    query,
  )
    .search(["name"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([campaignQuery.modelQuery, campaignQuery.countTotal()]);
  return { meta, result };
};

const getCampaign = async (query: { campaignId?: string }) => {
  validateFields(query, ["campaignId"]);
  const campaign = await Campaign.findById(query.campaignId)
    .populate([
      { path: "business", select: "name logo address" },
      { path: "offer", select: "title discountLabel" },
    ])
    .lean();
  if (!campaign) throw new ApiError(status.NOT_FOUND, "Campaign not found");
  return campaign;
};

const updateCampaign = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["campaignId"]);
  const campaign = await assertOwnsCampaign(userData, String(payload.campaignId));
  const fields = ["name", "about", "videoLengthSec", "targetCreators", "pricePerClaim", "status", "offer"];
  for (const f of fields) if (payload[f] !== undefined) (campaign as any)[f] = payload[f];
  await campaign.save();
  return campaign;
};

const deleteCampaign = async (userData: AuthUserPayload, payload: { campaignId?: string }) => {
  validateFields(payload, ["campaignId"]);
  const campaign = await assertOwnsCampaign(userData, String(payload.campaignId));
  await campaign.deleteOne();
  return { deleted: true };
};

// Merchant reviews the list of creators who applied to their campaign.
const getApplications = async (userData: AuthUserPayload, query: QueryParams) => {
  validateFields(query, ["campaignId"]);
  await assertOwnsCampaign(userData, String(query.campaignId));

  const appQuery = new QueryBuilder(
    CampaignApplication.find({ campaign: query.campaignId })
      .populate([{ path: "creator", select: "name profile_image" }])
      .lean(),
    query,
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([appQuery.modelQuery, appQuery.countTotal()]);
  return { meta, result };
};

// Merchant approves/rejects a creator into the campaign.
const reviewApplication = async (
  userData: AuthUserPayload,
  payload: { applicationId?: string; action?: string },
) => {
  validateFields(payload, ["applicationId", "action"]);
  const application = await CampaignApplication.findById(payload.applicationId);
  if (!application) throw new ApiError(status.NOT_FOUND, "Application not found");
  const campaign = await assertOwnsCampaign(userData, String(application.campaign));

  if (application.status !== EnumTaskStatus.APPLIED)
    throw new ApiError(status.BAD_REQUEST, "Application is not pending");

  if (payload.action === "approve") {
    application.status = EnumTaskStatus.APPROVED;
    application.approvedAt = new Date();
    application.commissionAmount = campaign.pricePerClaim;
    await application.save();
    await Campaign.updateOne({ _id: campaign._id }, { $inc: { approvedCount: 1 } });
  } else if (payload.action === "reject") {
    application.status = EnumTaskStatus.REJECTED;
    await application.save();
  } else {
    throw new ApiError(status.BAD_REQUEST, "action must be approve or reject");
  }
  return application;
};

// Merchant reviews the creator's uploaded draft video.
const reviewDraft = async (
  userData: AuthUserPayload,
  payload: { applicationId?: string; action?: string; merchantNote?: string },
) => {
  validateFields(payload, ["applicationId", "action"]);
  const application = await CampaignApplication.findById(payload.applicationId);
  if (!application) throw new ApiError(status.NOT_FOUND, "Application not found");
  await assertOwnsCampaign(userData, String(application.campaign));

  if (application.status !== EnumTaskStatus.DRAFT_SUBMITTED)
    throw new ApiError(status.BAD_REQUEST, "No draft awaiting review");

  if (payload.action === "approve") {
    application.draftApproved = true;
    application.merchantNote = payload.merchantNote;
    application.status = EnumTaskStatus.APPROVED; // ready for the creator to post
  } else if (payload.action === "reject") {
    application.status = EnumTaskStatus.REJECTED;
    application.merchantNote = payload.merchantNote;
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
  getApplications,
  reviewApplication,
  reviewDraft,
  verifyPublication,
};

export { CampaignService };
