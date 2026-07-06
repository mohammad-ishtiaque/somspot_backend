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

  const [categoryDistribution, publishedTasks, commissionAgg, merchantActivity] =
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
    ]);

  return {
    users: { consumers, merchants, creators },
    businesses: { total: totalBusinesses, pending: pendingBusinesses, approved: approvedBusinesses },
    offers: { active: activeOffers },
    claims: { total: totalClaims, redeemed: redeemedClaims },
    campaigns: { live: liveCampaigns },
    reviews: { total: totalReviews },
    payouts: { pending: pendingPayouts },
    estRevenue: revenueAgg[0]?.total || 0,
    pendingVerifications: recentBusinesses,
    categoryDistribution,
    influencer: {
      creators,
      publishedTasks,
      totalCommissions: commissionAgg[0]?.total || 0,
    },
    merchantActivity,
  };
};

const AdminService = {
  updateProfile,
  getProfile,
  deleteMyAccount,
  getPlatformAnalytics,
};

export { AdminService };
