import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import {
  EnumBusinessStatus,
  EnumCampaignStatus,
  EnumClaimStatus,
  EnumOfferStatus,
} from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Business from "../business/Business";
import BusinessView from "../business/BusinessView";
import Offer from "../offer/Offer";
import Claim from "../claim/Claim";
import Campaign from "../campaign/Campaign";
import Notification from "../notification/Notification";
import Auth from "../auth/Auth";
import User from "../user/User";
import Subscription from "../subscription/Subscription";
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import { EnumUserRole } from "../../../util/enum";
const { status } = require("http-status");

// Merchant home dashboard (Figma: greeting/notifications, Overview, Influencer
// Campaigns banner, Activity Summary, Top Deals, Recent Claims). One call for
// the whole screen.
const getDashboard = async (userData: AuthUserPayload) => {
  const [businesses, campaigns, merchantProfile] = await Promise.all([
    Business.find({ owner: userData.userId })
      .select("_id name status address")
      .lean(),
    Campaign.find({ merchant: userData.userId }).select("_id status").lean(),
    User.findById(userData.userId).select("name profile_image").lean(),
  ]);
  const ids = businesses.map((b) => b._id);
  const liveCampaigns = campaigns.filter((c) => c.status === EnumCampaignStatus.LIVE).length;
  const campaignStatus = {
    inReview: campaigns.filter((c) => c.status === EnumCampaignStatus.PENDING_REVIEW).length,
    active: liveCampaigns,
  };

  // The primary business shown in the header — the first approved one, or
  // just the first business if none are approved yet.
  const primaryBusiness =
    businesses.find((b) => b.status === EnumBusinessStatus.APPROVED) || businesses[0] || null;

  const [
    activeOffers,
    totalClaims,
    redeemedClaims,
    revenueAgg,
    unreadNotifications,
    recentClaims,
    topDeals,
    totalViews,
    uniqueViewerAgg,
  ] = await Promise.all([
    Offer.countDocuments({ business: { $in: ids }, status: EnumOfferStatus.ACTIVE, endAt: { $gt: new Date() } }),
    Claim.countDocuments({ business: { $in: ids } }),
    Claim.countDocuments({ business: { $in: ids }, status: EnumClaimStatus.REDEEMED }),
    Claim.aggregate([
      { $match: { business: { $in: ids }, status: EnumClaimStatus.REDEEMED } },
      { $lookup: { from: "offers", localField: "offer", foreignField: "_id", as: "offer" } },
      { $unwind: "$offer" },
      { $group: { _id: null, total: { $sum: "$offer.estimatedValue" } } },
    ]),
    Notification.countDocuments({ toId: userData.userId, isRead: false }),
    Claim.find({ business: { $in: ids } })
      .sort({ claimedAt: -1 })
      .limit(5)
      .populate([
        { path: "user", select: "name" },
        { path: "offer", select: "title discountLabel" },
      ])
      .lean(),
    Offer.find({ business: { $in: ids } })
      .sort({ totalClaims: -1 })
      .limit(5)
      .select("title discountLabel totalClaims business")
      .populate([{ path: "business", select: "name" }])
      .lean(),
    BusinessView.countDocuments({ business: { $in: ids } }),
    // Distinct viewer (logged-in id, else guest ip) across all-time views.
    BusinessView.aggregate([
      { $match: { business: { $in: ids } } },
      { $group: { _id: { $ifNull: ["$viewer", "$ip"] } } },
      { $count: "count" },
    ]),
  ]);

  const uniqueUsers = uniqueViewerAgg[0]?.count || 0;
  // Engagement: share of views that turned into a claim. Bounce rate: the
  // rest — views that didn't. There's no page/session tracking to measure a
  // "true" bounce rate, so this is the closest meaningful proxy available.
  const engagementRate = totalViews > 0 ? Math.round((totalClaims / totalViews) * 100) : 0;
  const bounceRate = totalViews > 0 ? 100 - engagementRate : 0;

  return {
    merchant: {
      name: merchantProfile?.name,
      profileImage: merchantProfile?.profile_image,
    },
    primaryBusiness: primaryBusiness
      ? { name: primaryBusiness.name, address: primaryBusiness.address }
      : null,
    unreadNotifications,
    campaignStatus,
    businessCount: businesses.length,
    approved: businesses.filter((b) => b.status === EnumBusinessStatus.APPROVED).length,
    pending: businesses.filter((b) => b.status === EnumBusinessStatus.PENDING).length,
    activeOffers,
    totalClaims,
    redeemedClaims,
    liveCampaigns,
    estRevenue: revenueAgg[0]?.total || 0,
    totalViews,
    activitySummary: {
      visitors: totalViews,
      uniqueUsers,
      engagementRate,
      bounceRate,
    },
    topDeals: topDeals.map((o: any) => ({
      title: o.title,
      discountLabel: o.discountLabel,
      businessName: o.business?.name,
      totalClaims: o.totalClaims,
    })),
    recentClaims: recentClaims.map((c: any) => ({
      offerTitle: c.offer?.title,
      discountLabel: c.offer?.discountLabel,
      claimedBy: c.user?.name,
      claimedAt: c.claimedAt,
    })),
  };
};

// Analytics tab: top performing offers + claims trend.
const getAnalytics = async (userData: AuthUserPayload) => {
  const businesses = await Business.find({ owner: userData.userId }).select("_id").lean();
  const ids = businesses.map((b) => b._id);

  const [topOffers, claimsTrend] = await Promise.all([
    Offer.find({ business: { $in: ids } })
      .sort({ totalClaims: -1 })
      .limit(5)
      .select("title discountLabel totalClaims business")
      .populate([{ path: "business", select: "name" }])
      .lean(),
    Claim.aggregate([
      {
        $match: {
          business: { $in: ids },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]),
  ]);

  return { topOffers, claimsTrend };
};

// Approval Progress screen: the merchant's businesses + verification state.
const getOnboardingStatus = async (userData: AuthUserPayload, query: QueryParams) => {
  const { meta, result } = await new QueryBuilder(
    Business.find({ owner: userData.userId })
      .select("name status rejectionReason logo createdAt")
      .lean(),
    query,
  ).execute(["name"]);
  return { meta, result };
};


// ---------------- Admin: merchant management ----------------

// Admin "Merchants Management" list matching Figma table (All Merchants, Approved, Pending, Rejected tabs).
const adminGetMerchants = async (query: QueryParams) => {
  const { status: statusFilter, ...listQuery } = query;

  const base: Record<string, unknown> = {};

  if (statusFilter && ["pending", "approved", "rejected"].includes(String(statusFilter).toLowerCase())) {
    base.status = String(statusFilter).toLowerCase();
  }

  const { meta, result: businesses } = await new QueryBuilder(
    Business.find(base)
      .populate([
        {
          path: "owner",
          select: "name email phoneNumber profile_image authId",
          populate: { path: "authId", select: "email phoneNumber isBlocked" },
        },
        { path: "category", select: "name slug" },
      ])
      .lean(),
    listQuery as QueryParams,
  ).execute(["name"]);

  const enrichedResult = businesses.map((b: any) => {
    const owner = b.owner || {};
    const auth = owner.authId || {};

    return {
      _id: b._id,
      businessId: b._id,
      merchantId: owner._id,
      businessName: b.name || "N/A",
      ownerName: owner.name || "N/A",
      owner: owner.name || "N/A",
      email: owner.email || auth.email || "",
      phone: owner.phoneNumber || auth.phoneNumber || b.phone || "",
      submittedDate: b.createdAt,
      submitted: b.createdAt,
      status: b.status || "pending",
      category: (b.category as any)?.name || "General",
      createdAt: b.createdAt,
    };
  });

  return { meta, result: enrichedResult };
};

// Admin "Merchant Details" matching Figma Merchant Details sections (Owner Info, Business Info, Subscription Status, Analytics Summary).
const adminGetMerchant = async (query: { merchantId?: string; businessId?: string; id?: string }) => {
  const targetId = query.businessId || query.merchantId || query.id;
  if (!targetId) throw new ApiError(status.BAD_REQUEST, "merchantId or businessId is required");

  let business = await Business.findById(targetId)
    .populate([
      {
        path: "owner",
        select: "name email phoneNumber profile_image authId createdAt",
        populate: { path: "authId", select: "email phoneNumber isBlocked" },
      },
      { path: "category", select: "name slug" },
    ])
    .lean();

  if (!business) {
    business = await Business.findOne({ owner: targetId })
      .populate([
        {
          path: "owner",
          select: "name email phoneNumber profile_image authId createdAt",
          populate: { path: "authId", select: "email phoneNumber isBlocked" },
        },
        { path: "category", select: "name slug" },
      ])
      .lean();
  }

  if (!business) throw new ApiError(status.NOT_FOUND, "Merchant/Business not found");

  const ownerObj: any = business.owner || {};
  const authObj: any = ownerObj.authId || {};

  const [totalListings, activeOffersCount, claimsCount, viewsAgg, subscription] = await Promise.all([
    Business.countDocuments({ owner: ownerObj._id || targetId }),
    Offer.countDocuments({ business: business._id, status: EnumOfferStatus.ACTIVE }),
    Claim.countDocuments({ business: business._id }),
    BusinessView.countDocuments({ business: business._id }),
    Subscription.findOne({ merchant: ownerObj._id || targetId }).lean(),
  ]);

  const planName = (subscription as any)?.plan || "Premium";
  const subStatus = (subscription as any)?.status || "active";

  return {
    _id: business._id,
    businessId: business._id,
    merchantId: ownerObj._id,
    businessName: business.name,
    status: business.status || "pending",
    rejectionReason: business.rejectionReason || null,

    ownerInformation: {
      ownerName: ownerObj.name || "N/A",
      email: ownerObj.email || authObj.email || "",
      phone: ownerObj.phoneNumber || authObj.phoneNumber || business.phone || "",
      submittedDate: business.createdAt,
      avatar: ownerObj.profile_image || null,
    },

    businessInformation: {
      businessName: business.name,
      businessType: (business.category as any)?.name || "Restaurant",
      category: (business.category as any)?.name || "Restaurant",
      address: business.address || "",
      subscriptionPlan: planName,
      description: business.description || "",
      logo: business.logo || null,
      coverImage: business.coverImage || null,
    },

    subscriptionStatus: {
      currentPlan: planName,
      status: subStatus,
      startDate: (subscription as any)?.startDate || null,
      endDate: (subscription as any)?.endDate || null,
    },

    analyticsSummary: {
      totalListings,
      activeOffers: activeOffersCount,
      totalViews: viewsAgg || 0,
      offerClaims: claimsCount,
    },

    merchant: ownerObj,
    business,
    subscription,
  };
};

const adminToggleBlockMerchant = async (payload: { merchantId?: string; isBlocked?: boolean }) => {
  validateFields(payload, ["merchantId"]);
  const merchant = await User.findById(payload.merchantId).select("authId").lean();
  if (!merchant) throw new ApiError(status.NOT_FOUND, "Merchant not found");
  const isBlocked = payload.isBlocked ?? true;
  await Auth.updateOne({ _id: merchant.authId }, { $set: { isBlocked } });
  return { merchantId: payload.merchantId, isBlocked };
};

const adminVerifyMerchant = async (payload: { merchantId?: string; businessId?: string; action?: string; rejectionReason?: string }) => {
  validateFields(payload, ["action"]);
  const targetId = payload.businessId || payload.merchantId;
  if (!targetId) throw new ApiError(status.BAD_REQUEST, "businessId or merchantId is required");

  let business = await Business.findById(targetId);
  if (!business) {
    business = await Business.findOne({ owner: targetId });
  }
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");

  if (payload.action === "approve") {
    business.status = EnumBusinessStatus.APPROVED;
    business.rejectionReason = undefined;
  } else if (payload.action === "reject") {
    business.status = EnumBusinessStatus.REJECTED;
    business.rejectionReason = payload.rejectionReason || "Application rejected by admin";
  } else {
    throw new ApiError(status.BAD_REQUEST, "action must be approve or reject");
  }

  await business.save();
  return business;
};

const MerchantService = {
  getDashboard,
  getAnalytics,
  getOnboardingStatus,
  adminGetMerchants,
  adminGetMerchant,
  adminToggleBlockMerchant,
  adminVerifyMerchant,
};

export { MerchantService };
