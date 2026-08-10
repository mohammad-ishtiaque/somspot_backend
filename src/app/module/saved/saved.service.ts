const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import { AuthUserPayload } from "../../../types/auth.types";
import Saved from "./Saved";
import Business from "../business/Business";
import Offer from "../offer/Offer";

// Toggle save/unsave for a business OR an offer. Returns the resulting state.
const toggleSaved = async (
  userData: AuthUserPayload,
  payload: { businessId?: string; offerId?: string },
) => {
  if (!payload.businessId && !payload.offerId) {
    throw new ApiError(status.BAD_REQUEST, "Either businessId or offerId is required");
  }

  if (payload.businessId) {
    const business = await Business.findById(payload.businessId).select("_id");
    if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");

    const existing = await Saved.findOne({ user: userData.userId, business: payload.businessId });
    if (existing) {
      await existing.deleteOne();
      return { saved: false, type: "business" };
    }
    const doc = await Saved.create({ user: userData.userId, business: payload.businessId });
    return { saved: true, type: "business", doc };
  } else {
    const offer = await Offer.findById(payload.offerId).select("_id");
    if (!offer) throw new ApiError(status.NOT_FOUND, "Offer not found");

    const existing = await Saved.findOne({ user: userData.userId, offer: payload.offerId });
    if (existing) {
      await existing.deleteOne();
      return { saved: false, type: "offer" };
    }
    const doc = await Saved.create({ user: userData.userId, offer: payload.offerId });
    return { saved: true, type: "offer", doc };
  }
};

const getAllSaved = async (userData: AuthUserPayload, query: QueryParams) => {
  const type = String(query.type || "business").toLowerCase();
  const filter: Record<string, unknown> = { user: userData.userId };

  if (type === "offer") {
    filter.offer = { $exists: true, $ne: null };
  } else {
    filter.business = { $exists: true, $ne: null };
  }

  const { meta, result } = await new QueryBuilder(
    Saved.find(filter)
      .populate([
        { path: "business", select: "name logo category address ratingAvg ratingCount" },
        {
          path: "offer",
          select: "title discountLabel offerImage terms endAt status",
          populate: { path: "business", select: "name logo address" },
        },
      ])
      .lean(),
    query,
  ).execute(["type"]);

  return { meta, result };
};

const removeSaved = async (
  userData: AuthUserPayload,
  payload: { businessId?: string; offerId?: string },
) => {
  if (!payload.businessId && !payload.offerId) {
    throw new ApiError(status.BAD_REQUEST, "Either businessId or offerId is required");
  }

  const filter: Record<string, unknown> = { user: userData.userId };
  if (payload.businessId) filter.business = payload.businessId;
  if (payload.offerId) filter.offer = payload.offerId;

  const result = await Saved.deleteOne(filter);
  if (!result.deletedCount) throw new ApiError(status.NOT_FOUND, "Not in saved list");
  return { deleted: true };
};

const SavedService = { toggleSaved, getAllSaved, removeSaved };

export { SavedService };
