import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import {
  EnumBusinessStatus,
  EnumCampaignStatus,
  EnumClaimStatus,
  EnumOfferStatus,
} from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Business from "../business/Business";
import Offer from "../offer/Offer";
import Claim from "../claim/Claim";
import Campaign from "../campaign/Campaign";

// Merchant home dashboard (Figma: Active Offers, Est. Revenue, Influencer Campaigns).
const getDashboard = async (userData: AuthUserPayload) => {
  const businesses = await Business.find({ owner: userData.userId })
    .select("_id name status")
    .lean();
  const ids = businesses.map((b) => b._id);

  const [activeOffers, totalClaims, redeemedClaims, liveCampaigns, revenueAgg] =
    await Promise.all([
      Offer.countDocuments({ business: { $in: ids }, status: EnumOfferStatus.ACTIVE, endAt: { $gt: new Date() } }),
      Claim.countDocuments({ business: { $in: ids } }),
      Claim.countDocuments({ business: { $in: ids }, status: EnumClaimStatus.REDEEMED }),
      Campaign.countDocuments({ merchant: userData.userId, status: EnumCampaignStatus.LIVE }),
      Claim.aggregate([
        { $match: { business: { $in: ids }, status: EnumClaimStatus.REDEEMED } },
        { $lookup: { from: "offers", localField: "offer", foreignField: "_id", as: "offer" } },
        { $unwind: "$offer" },
        { $group: { _id: null, total: { $sum: "$offer.estimatedValue" } } },
      ]),
    ]);

  return {
    businessCount: businesses.length,
    approved: businesses.filter((b) => b.status === EnumBusinessStatus.APPROVED).length,
    pending: businesses.filter((b) => b.status === EnumBusinessStatus.PENDING).length,
    activeOffers,
    totalClaims,
    redeemedClaims,
    liveCampaigns,
    estRevenue: revenueAgg[0]?.total || 0,
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
  const businessQuery = new QueryBuilder(
    Business.find({ owner: userData.userId })
      .select("name status rejectionReason logo createdAt")
      .lean(),
    query,
  )
    .search(["name"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([businessQuery.modelQuery, businessQuery.countTotal()]);
  return { meta, result };
};

const MerchantService = { getDashboard, getAnalytics, getOnboardingStatus };

export { MerchantService };
