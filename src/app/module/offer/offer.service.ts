const { status } = require("http-status");
import { isPrivileged } from "../../../util/authz";
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumOfferStatus, EnumUserRole } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Offer from "./Offer";
import Business from "../business/Business";
import Claim from "../claim/Claim";
import Saved from "../saved/Saved";
import OfferView from "./OfferView";
import postNotification from "../../../util/postNotification";

// Derived status, evaluated fresh on every read (never persisted): an offer
// still awaiting admin approval, rejected, or manually paused stays as-is;
// otherwise a future startAt makes it SCHEDULED, a past endAt makes it
// EXPIRED, and anything else is ACTIVE.
const withDerivedStatus = <T extends { startAt?: Date; endAt: Date; status: string }>(
  offer: T,
): T => {
  if (
    offer.status === EnumOfferStatus.INACTIVE ||
    offer.status === EnumOfferStatus.PENDING ||
    offer.status === EnumOfferStatus.REJECTED
  )
    return offer;
  const now = Date.now();
  if (offer.startAt && new Date(offer.startAt).getTime() > now)
    return { ...offer, status: EnumOfferStatus.SCHEDULED };
  if (new Date(offer.endAt).getTime() < now)
    return { ...offer, status: EnumOfferStatus.EXPIRED };
  return { ...offer, status: EnumOfferStatus.ACTIVE };
};

type OfferStatusCounts = {
  pending: number;
  active: number;
  scheduled: number;
  expired: number;
  inactive: number;
  rejected: number;
};

// Filters/searches/paginates an already status-derived offer list in memory.
// Needed because status here is computed, not a stored field the DB can filter on.
const paginateDerived = <T extends { title: string; status: string }>(
  offers: T[],
  query: QueryParams,
) => {
  let filtered = query.status ? offers.filter((o) => o.status === query.status) : offers;
  if (query.searchTerm) {
    const term = query.searchTerm.toLowerCase();
    filtered = filtered.filter((o) => o.title?.toLowerCase().includes(term));
  }

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const total = filtered.length;
  const result = filtered.slice((page - 1) * limit, (page - 1) * limit + limit);

  return { meta: { page, limit, total, totalPage: Math.ceil(total / limit) }, result };
};

const countByStatus = (offers: { status: string }[]): OfferStatusCounts =>
  offers.reduce(
    (acc, o) => {
      if (o.status in acc) acc[o.status as keyof OfferStatusCounts] += 1;
      return acc;
    },
    { pending: 0, active: 0, scheduled: 0, expired: 0, inactive: 0, rejected: 0 } as OfferStatusCounts,
  );

const assertOwnsBusiness = async (userData: AuthUserPayload, businessId: string) => {
  const business = await Business.findById(businessId).select("owner");
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");
  if (!isPrivileged(userData.role) && String(business.owner) !== userData.userId)
    throw new ApiError(status.FORBIDDEN, "Not your business");
  return business;
};

const createOffer = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["business", "title", "endAt"]);
  await assertOwnsBusiness(userData, String(payload.business));

  return Offer.create({
    business: payload.business,
    title: payload.title,
    description: payload.description,
    offerImage: payload.offerImage,
    discountLabel: payload.discountLabel,
    terms: payload.terms,
    startAt: payload.startAt,
    endAt: payload.endAt,
    claimLimitPerUser: payload.claimLimitPerUser ?? 1,
    estimatedValue: payload.estimatedValue ?? 0,
    createdBy: userData.userId,
  });
};

// Consumer-facing: live offers only — excludes both not-yet-started
// (scheduled) and expired offers. Filter by business or category.
const getAllOffers = async (query: QueryParams, userData?: AuthUserPayload) => {
  const now = new Date();
  const base: Record<string, unknown> = {
    status: EnumOfferStatus.ACTIVE,
    startAt: { $lte: now },
    endAt: { $gt: now },
  };
  if (query.business) base.business = query.business;

  let businessFilterIds: string[] | undefined;
  if (query.category) {
    const businesses = await Business.find({ category: query.category }).select("_id").lean();
    businessFilterIds = businesses.map((b) => String(b._id));
    base.business = { $in: businessFilterIds };
  }

  let savedOfferIds: Set<string> | undefined;
  if (userData?.userId) {
    const savedDocs = await Saved.find({ user: userData.userId, offer: { $exists: true, $ne: null } }).select("offer").lean();
    savedOfferIds = new Set(savedDocs.map(d => String(d.offer)));
    
    if (String(query.isSaved) === "true") {
      if (savedDocs.length === 0) {
        return { meta: { page: 1, limit: 10, total: 0, totalPage: 0 }, result: [] };
      }
      base._id = { $in: Array.from(savedOfferIds) };
    }
  } else if (String(query.isSaved) === "true") {
    throw new ApiError(status.UNAUTHORIZED, "Login required to view saved offers");
  }

  const { meta, result } = await new QueryBuilder(
    Offer.find(base).populate([{ path: "business", select: "name logo category address ratingAvg" }]).lean(),
    query,
  ).execute(["title"]);

  const derivedResult = result.map(withDerivedStatus);

  const targetUserId = userData?.userId;
  const targetAuthId = userData?.authId;

  if ((targetUserId || targetAuthId) && derivedResult.length > 0) {
    const offerIds = derivedResult.map((o: any) => o._id);
    const userQueryConditions: any[] = [];
    if (targetUserId) userQueryConditions.push({ user: targetUserId });
    if (targetAuthId) userQueryConditions.push({ user: targetAuthId });

    const userClaims = await Claim.find({
      $or: userQueryConditions,
      offer: { $in: offerIds },
    }).lean();

    const claimMap = new Map<string, any>();
    userClaims.forEach((c) => {
      claimMap.set(String(c.offer), c);
    });

    const enrichedResult = derivedResult.map((o: any) => {
      const claim = claimMap.get(String(o._id));
      return {
        ...o,
        isClaimed: Boolean(claim),
        claimCode: claim ? claim.code : null,
        claimStatus: claim ? claim.status : null,
        claimId: claim ? String(claim._id) : null,
        isSaved: savedOfferIds ? savedOfferIds.has(String(o._id)) : false,
      };
    });

    return { meta, result: enrichedResult };
  }

  const publicResult = derivedResult.map((o: any) => ({
    ...o,
    isClaimed: false,
    claimCode: null,
    claimStatus: null,
    claimId: null,
    isSaved: false,
  }));

  return { meta, result: publicResult };
};

const getTopDeals = async (query: QueryParams, userData?: AuthUserPayload) => {
  // Use getAllOffers but force sort by -estimatedValue and limit
  const topDealsQuery = {
    ...query,
    sort: "-estimatedValue,-createdAt",
    limit: String(query.limit || 10),
    page: "1", // force page 1
  };
  return getAllOffers(topDealsQuery, userData);
};

const getOffer = async (
  query: { offerId?: string; id?: string; _id?: string },
  userData?: AuthUserPayload,
  viewerIp?: string,
) => {
  const targetOfferId = query.offerId || query.id || query._id;
  if (!targetOfferId) {
    throw new ApiError(status.BAD_REQUEST, "offerId is required");
  }

  const offer = await Offer.findById(targetOfferId)
    .populate([{ path: "business", select: "name logo address phone category ratingAvg" }])
    .lean();
  if (!offer) throw new ApiError(status.NOT_FOUND, "Offer not found");
  const derived = withDerivedStatus(offer);

  const isOwnerOrAdmin =
    !!userData &&
    (isPrivileged(userData.role) || String(offer.createdBy) === userData.userId);

  // Offers awaiting approval, rejected, or manually paused are only visible
  // to their creator or an admin — not reachable by a shared/guessed offerId.
  const heldBackStatuses: string[] = [EnumOfferStatus.PENDING, EnumOfferStatus.REJECTED, EnumOfferStatus.INACTIVE];
  if (heldBackStatuses.includes(derived.status) && !isOwnerOrAdmin) {
    throw new ApiError(status.NOT_FOUND, "Offer not found");
  }

  // Fire-and-forget: log real customer views for the admin Analytics page's
  // Offer Engagement trend. Skip the creator/admin browsing their own offer
  // so that doesn't inflate engagement numbers (mirrors BusinessView).
  if (!isOwnerOrAdmin) {
    OfferView.create({ offer: offer._id, viewer: userData?.userId, ip: viewerIp }).catch(() => {});
  }

  let isClaimed = false;
  let claimCode: string | null = null;
  let claimStatus: string | null = null;
  let claimId: string | null = null;

  let isSaved = false;

  const targetUserId = userData?.userId;
  const targetAuthId = userData?.authId;

  if (targetUserId || targetAuthId) {
    if (targetUserId) {
      const saved = await Saved.exists({ user: targetUserId, offer: offer._id });
      isSaved = !!saved;
    }

    const userQueryConditions: any[] = [];
    if (targetUserId) userQueryConditions.push({ user: targetUserId });
    if (targetAuthId) userQueryConditions.push({ user: targetAuthId });

    const claim = await Claim.findOne({
      $or: userQueryConditions,
      offer: offer._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (claim) {
      isClaimed = true;
      claimCode = claim.code;
      claimStatus = claim.status;
      claimId = String(claim._id);
    }
  }

  return {
    ...derived,
    isClaimed,
    claimCode,
    claimStatus,
    claimId,
    isSaved,
  };
};

// Merchant "Offers" screen — active/scheduled/expired tabs with counts, all
// computed from live startAt/endAt rather than the (often stale) stored status.
const getMyOffers = async (userData: AuthUserPayload, query: QueryParams) => {
  const myBusinesses = await Business.find({ owner: userData.userId }).select("_id").lean();
  const ids = myBusinesses.map((b) => b._id);

  const offers = await Offer.find({ business: { $in: ids } })
    .populate([{ path: "business", select: "name logo" }])
    .sort((query.sort || "").split(",").join(" ") || "-createdAt")
    .lean();

  const derived = offers.map(withDerivedStatus);
  const counts = countByStatus(derived);
  const { meta, result } = paginateDerived(derived, query);
  return { meta, result, counts };
};

const updateOffer = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["offerId"]);
  const offer = await Offer.findById(payload.offerId);
  if (!offer) throw new ApiError(status.NOT_FOUND, "Offer not found");
  await assertOwnsBusiness(userData, String(offer.business));

  const fields = ["title", "description", "offerImage", "discountLabel", "terms", "startAt", "endAt", "status", "claimLimitPerUser", "estimatedValue"];
  for (const f of fields) if (payload[f] !== undefined) (offer as any)[f] = payload[f];
  await offer.save();
  return offer;
};

const deleteOffer = async (userData: AuthUserPayload, payload: { offerId?: string }) => {
  validateFields(payload, ["offerId"]);
  const offer = await Offer.findById(payload.offerId);
  if (!offer) throw new ApiError(status.NOT_FOUND, "Offer not found");
  await assertOwnsBusiness(userData, String(offer.business));
  await offer.deleteOne();
  return { deleted: true };
};


// Admin "Offers & Promotions" — all offers regardless of status. status filter
// (pending/active/scheduled/expired/inactive/rejected) is applied to the
// derived status, same as the merchant list, since scheduled/expired are
// never stored values. Also surfaces the merchant (createdBy) name and each
// offer's view count for the admin list/detail screens.
const adminGetAll = async (query: QueryParams) => {
  const base: Record<string, unknown> = {};
  if (query.business) base.business = query.business;

  const offers = await Offer.find(base)
    .populate([
      { path: "business", select: "name logo category" },
      { path: "createdBy", select: "name email" },
    ])
    .sort((query.sort || "").split(",").join(" ") || "-createdAt")
    .lean();

  const viewCounts = await OfferView.aggregate([
    { $match: { offer: { $in: offers.map((o) => o._id) } } },
    { $group: { _id: "$offer", count: { $sum: 1 } } },
  ]);
  const viewsByOffer = new Map(viewCounts.map((v) => [String(v._id), v.count]));

  const derived = offers.map((o) => ({
    ...withDerivedStatus(o),
    views: viewsByOffer.get(String(o._id)) || 0,
  }));
  const counts = countByStatus(derived);
  const { meta, result } = paginateDerived(derived, query);
  return { meta, result, counts };
};

// Admin approve/reject for a PENDING offer (Offers & Promotions moderation).
// Approving sets ACTIVE (withDerivedStatus still shows SCHEDULED on read if
// startAt is in the future); rejecting is a terminal REJECTED state — the
// merchant can still edit + it stays hidden until deleted or resubmitted
// via a fresh update.
const adminModerate = async (payload: { offerId?: string; action?: string }) => {
  validateFields(payload, ["offerId", "action"]);
  const offer = await Offer.findById(payload.offerId).populate("business", "name");
  if (!offer) throw new ApiError(status.NOT_FOUND, "Offer not found");

  if (payload.action === "approve") {
    offer.status = EnumOfferStatus.ACTIVE;
    await offer.save();
    postNotification("Offer Approved", `Your offer "${offer.title}" is now live.`, String(offer.createdBy));
  } else if (payload.action === "reject") {
    offer.status = EnumOfferStatus.REJECTED;
    await offer.save();
    postNotification("Offer Rejected", `Your offer "${offer.title}" was rejected by a moderator.`, String(offer.createdBy));
  } else {
    throw new ApiError(status.BAD_REQUEST, "action must be approve or reject");
  }
  return offer;
};

const OfferService = {
  createOffer,
  getAllOffers,
  getTopDeals,
  getOffer,
  getMyOffers,
  updateOffer,
  deleteOffer,
  adminGetAll,
  adminModerate,
};

export { OfferService };
