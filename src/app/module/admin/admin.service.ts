const { default: status } = require("http-status");
import ApiError from "../../../error/ApiError";
import Auth from "../auth/Auth";
import Admin from "./Admin";
import unlinkFile from "../../../util/unlinkFile";
import deleteFalsyField from "../../../util/deleteFalsyField";
import { Request } from "express";
import { AuthUserPayload } from "../../../types/auth.types";
import User from "../user/User";
import Business from "../business/Business";
import Offer from "../offer/Offer";
import Claim from "../claim/Claim";
import Campaign from "../campaign/Campaign";
import Review from "../review/Review";
import Payout from "../creator/Payout";
import Earning from "../creator/Earning";
import Payment from "../payment/Payment";
import Subscription from "../subscription/Subscription";
import OfferView from "../offer/OfferView";
import { EnumSubscriptionStatus } from "../../../util/enum";
import CampaignApplication from "../creator/CampaignApplication";
import { EnumTaskStatus } from "../../../util/enum";
import {
  EnumUserRole,
  EnumBusinessStatus,
  EnumOfferStatus,
  EnumClaimStatus,
  EnumCampaignStatus,
  EnumPayoutStatus,
} from "../../../util/enum";

const updateProfile = async (req: Request) => {
  const { body: data } = req;
  const { userId, authId } = req.user as AuthUserPayload;
  const files = req.files as
    | {
        [fieldname: string]: Express.Multer.File[];
      }
    | undefined;

  const updatedData: Record<string, string> = {
    ...(data.address && { address: data.address }),
    ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
    ...(data.name && { name: data.name }),
  };

  deleteFalsyField(updatedData);
  const existingUser = await Admin.findById(userId).lean();

  let hasNewImage = false;
  if (files && files.profile_image) {
    updatedData.profile_image = files.profile_image[0].path;
    hasNewImage = true;
  }

  const [auth, admin] = await Promise.all([
    Auth.findByIdAndUpdate(
      authId,
      { name: updatedData.name },
      {
        returnDocument: "after",
      },
    ),
    Admin.findByIdAndUpdate(
      userId,
      { ...updatedData },
      {
        returnDocument: "after",
      },
    ).populate("authId"),
  ]);

  if (!auth || !admin) throw new ApiError(status.NOT_FOUND, "User not found!");

  if (hasNewImage && existingUser && existingUser.profile_image) {
    unlinkFile(existingUser.profile_image);
  }

  return admin;
};

const getProfile = async (userData: AuthUserPayload) => {
  const { userId, authId } = userData;

  const [auth, result] = await Promise.all([
    Auth.findById(authId).lean(),
    Admin.findById(userId).populate("authId").lean(),
  ]);

  if (!result || !auth) throw new ApiError(status.NOT_FOUND, "Admin not found");
  if (auth.isBlocked)
    throw new ApiError(status.FORBIDDEN, "You are blocked. Contact support");

  return result;
};

const deleteMyAccount = async (payload: {
  email: string;
  password: string;
}) => {
  const { email, password } = payload;

  const [auth, admin] = await Promise.all([
    Auth.findOne({ email }).select("+password").lean(),
    Admin.findOne({ email }).lean(),
  ]);

  if (!auth || !admin) {
    throw new ApiError(status.NOT_FOUND, "Admin does not exist");
  }
  if (
    auth.password &&
    !(await Auth.isPasswordMatched(password, auth.password))
  ) {
    throw new ApiError(status.FORBIDDEN, "Password is incorrect");
  }

  if (admin.profile_image) {
    unlinkFile(admin.profile_image);
  }

  await Promise.all([
    Auth.deleteOne({ _id: auth._id }),
    Admin.deleteOne({ _id: admin._id }),
  ]);
};


// Platform-wide analytics for the admin dashboard.
const getPlatformAnalytics = async () => {
  const [
    merchants,
    creators,
    consumers,
    totalBusinesses,
    pendingBusinesses,
    approvedBusinesses,
    activeOffers,
    totalClaims,
    redeemedClaims,
    liveCampaigns,
    totalReviews,
    pendingPayouts,
    revenueAgg,
    recentBusinesses,
  ] = await Promise.all([
    Auth.countDocuments({ role: EnumUserRole.MERCHANT }),
    Auth.countDocuments({ role: EnumUserRole.CREATOR }),
    Auth.countDocuments({ role: EnumUserRole.USER }),
    Business.countDocuments({}),
    Business.countDocuments({ status: EnumBusinessStatus.PENDING }),
    Business.countDocuments({ status: EnumBusinessStatus.APPROVED }),
    Offer.countDocuments({ status: EnumOfferStatus.ACTIVE, endAt: { $gt: new Date() } }),
    Claim.countDocuments({}),
    Claim.countDocuments({ status: EnumClaimStatus.REDEEMED }),
    Campaign.countDocuments({ status: EnumCampaignStatus.LIVE }),
    Review.countDocuments({}),
    Payout.countDocuments({ status: EnumPayoutStatus.PENDING }),
    Claim.aggregate([
      { $match: { status: EnumClaimStatus.REDEEMED } },
      { $lookup: { from: "offers", localField: "offer", foreignField: "_id", as: "offer" } },
      { $unwind: "$offer" },
      { $group: { _id: null, total: { $sum: "$offer.estimatedValue" } } },
    ]),
    Business.find({ status: EnumBusinessStatus.PENDING })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name status createdAt")
      .lean(),
  ]);

  const monthStart = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  const [categoryDistribution, publishedTasks, commissionAgg, merchantActivity, usersTrend, revenueTrend, activeSubscriptions, recentActivity] =
    await Promise.all([
      Business.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "category" } },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, category: "$category.name", count: 1 } },
        { $sort: { count: -1 } },
      ]),
      CampaignApplication.countDocuments({ status: EnumTaskStatus.PUBLISHED }),
      Earning.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Auth.aggregate([
        { $match: { role: EnumUserRole.MERCHANT, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: "$_id", count: 1 } },
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: monthStart } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, total: { $sum: "$price" } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: "$_id", total: 1 } },
      ]),
      Subscription.countDocuments({ status: EnumSubscriptionStatus.ACTIVE }),
      Claim.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .populate([
          { path: "offer", select: "title" },
          { path: "user", select: "name" },
        ])
        .lean(),
    ]);

  // ---- Analytics page: last 6 months, one bucket per calendar month ----
  // `monthBoundaries[i].end` is the last instant of that month, used for
  // *cumulative* running-total counts (matches a growth chart ending at the
  // current total). `monthBoundaries[i].start` is that month's first instant,
  // used for *per-month* counts (new activity within that month only).
  const now = new Date();
  const monthBoundaries = Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i; // 5 = 5 months ago ... 0 = current month
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
    const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    return { label, start, end };
  });

  const [userGrowthTrend, merchantGrowthTrend, offerEngagementTrend, activeMerchants, totalRevenueAgg] =
    await Promise.all([
      // Cumulative consumer total + cumulative active-consumer total, per month.
      Promise.all(
        monthBoundaries.map(async ({ label, end }) => {
          const [users, active] = await Promise.all([
            Auth.countDocuments({ role: EnumUserRole.USER, createdAt: { $lte: end } }),
            Auth.countDocuments({ role: EnumUserRole.USER, isActive: true, createdAt: { $lte: end } }),
          ]);
          return { month: label, users, active };
        }),
      ),
      // Cumulative merchant total, per month.
      Promise.all(
        monthBoundaries.map(async ({ label, end }) => {
          const merchantsCount = await Auth.countDocuments({ role: EnumUserRole.MERCHANT, createdAt: { $lte: end } });
          return { month: label, merchants: merchantsCount };
        }),
      ),
      // Views (OfferView) + claims created within each month.
      Promise.all(
        monthBoundaries.map(async ({ label, start, end }) => {
          const [views, claims] = await Promise.all([
            OfferView.countDocuments({ createdAt: { $gte: start, $lte: end } }),
            Claim.countDocuments({ createdAt: { $gte: start, $lte: end } }),
          ]);
          return { month: label, views, claims };
        }),
      ),
      Auth.countDocuments({ role: EnumUserRole.MERCHANT, isActive: true }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$price" } } }]),
    ]);

  // Simple month-over-month % change (last bucket vs the one before it) for
  // the Analytics page's 4 stat cards.
  const pctChange = (curr: number, prev: number) => (prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0);
  const last = monthBoundaries.length - 1;
  const changes = {
    users: pctChange(userGrowthTrend[last].users, userGrowthTrend[last - 1]?.users ?? 0),
    merchants: pctChange(merchantGrowthTrend[last].merchants, merchantGrowthTrend[last - 1]?.merchants ?? 0),
    claims: pctChange(offerEngagementTrend[last].claims, offerEngagementTrend[last - 1]?.claims ?? 0),
    revenue: pctChange(revenueTrend[revenueTrend.length - 1]?.total ?? 0, revenueTrend[revenueTrend.length - 2]?.total ?? 0),
  };

  return {
    users: { consumers, merchants, creators, activeMerchants },
    businesses: { total: totalBusinesses, pending: pendingBusinesses, approved: approvedBusinesses },
    offers: { active: activeOffers },
    claims: { total: totalClaims, redeemed: redeemedClaims },
    campaigns: { live: liveCampaigns },
    reviews: { total: totalReviews },
    payouts: { pending: pendingPayouts },
    estRevenue: revenueAgg[0]?.total || 0,
    totalRevenue: totalRevenueAgg[0]?.total || 0,
    pendingVerifications: recentBusinesses,
    categoryDistribution,
    influencer: {
      creators,
      publishedTasks,
      totalCommissions: commissionAgg[0]?.total || 0,
    },
    merchantActivity,
    usersTrend,
    revenueTrend,
    activeSubscriptions,
    recentActivity,
    // Added for the admin Analytics page (`/analytics`) — additive only,
    // existing fields above are unchanged so the Dashboard page keeps working.
    userGrowthTrend,
    merchantGrowthTrend,
    offerEngagementTrend,
    changes,
  };
};

const AdminService = {
  updateProfile,
  getProfile,
  deleteMyAccount,
  getPlatformAnalytics,
};

export { AdminService };
