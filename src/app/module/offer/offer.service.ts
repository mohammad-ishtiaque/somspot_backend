const { status } = require("http-status");
import { isPrivileged } from "../../../util/authz";
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumOfferStatus, EnumUserRole } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Offer from "./Offer";
import Business from "../business/Business";

// Derived status: an offer past its endAt is expired regardless of stored value.
const withLiveStatus = <T extends { endAt: Date; status: string }>(offer: T): T => {
  if (offer.status === EnumOfferStatus.ACTIVE && new Date(offer.endAt).getTime() < Date.now())
    return { ...offer, status: EnumOfferStatus.EXPIRED };
  return offer;
};

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
    discountLabel: payload.discountLabel,
    terms: payload.terms,
    startAt: payload.startAt,
    endAt: payload.endAt,
    claimLimitPerUser: payload.claimLimitPerUser ?? 1,
    estimatedValue: payload.estimatedValue ?? 0,
    createdBy: userData.userId,
  });
};

// Consumer-facing: active, non-expired offers. Filter by business or category.
const getAllOffers = async (query: QueryParams) => {
  const base: Record<string, unknown> = {
    status: EnumOfferStatus.ACTIVE,
    endAt: { $gt: new Date() },
  };
  if (query.business) base.business = query.business;

  let businessFilterIds: string[] | undefined;
  if (query.category) {
    const businesses = await Business.find({ category: query.category }).select("_id").lean();
    businessFilterIds = businesses.map((b) => String(b._id));
    base.business = { $in: businessFilterIds };
  }

  const { meta, result } = await new QueryBuilder(
    Offer.find(base).populate([{ path: "business", select: "name logo category address ratingAvg" }]).lean(),
    query,
  ).execute(["title"]);
  return { meta, result: result.map(withLiveStatus) };
};

const getOffer = async (query: { offerId?: string }) => {
  validateFields(query, ["offerId"]);
  const offer = await Offer.findById(query.offerId)
    .populate([{ path: "business", select: "name logo address phone category ratingAvg" }])
    .lean();
  if (!offer) throw new ApiError(status.NOT_FOUND, "Offer not found");
  return withLiveStatus(offer);
};

const getMyOffers = async (userData: AuthUserPayload, query: QueryParams) => {
  const myBusinesses = await Business.find({ owner: userData.userId }).select("_id").lean();
  const ids = myBusinesses.map((b) => b._id);

  const { meta, result } = await new QueryBuilder(
    Offer.find({ business: { $in: ids } }).populate([{ path: "business", select: "name logo" }]).lean(),
    query,
  ).execute(["title"]);
  return { meta, result: result.map(withLiveStatus) };
};

const updateOffer = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["offerId"]);
  const offer = await Offer.findById(payload.offerId);
  if (!offer) throw new ApiError(status.NOT_FOUND, "Offer not found");
  await assertOwnsBusiness(userData, String(offer.business));

  const fields = ["title", "description", "discountLabel", "terms", "startAt", "endAt", "status", "claimLimitPerUser", "estimatedValue"];
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


// Admin "Offers & Promotions" — all offers regardless of status.
const adminGetAll = async (query: QueryParams) => {
  const base: Record<string, unknown> = {};
  if (query.status) base.status = query.status;
  if (query.business) base.business = query.business;

  const { meta, result } = await new QueryBuilder(
    Offer.find(base).populate([{ path: "business", select: "name logo category" }]).lean(),
    query,
  ).execute(["title"]);
  return { meta, result: result.map(withLiveStatus) };
};

const OfferService = {
  createOffer,
  getAllOffers,
  getOffer,
  getMyOffers,
  updateOffer,
  deleteOffer,
  adminGetAll,
};

export { OfferService };
