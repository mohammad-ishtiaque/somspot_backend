const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { AuthUserPayload } from "../../../types/auth.types";
import Saved from "./Saved";
import Business from "../business/Business";

// Toggle save/unsave for a business. Returns the resulting state.
const toggleSaved = async (userData: AuthUserPayload, payload: { businessId?: string }) => {
  validateFields(payload, ["businessId"]);

  const business = await Business.findById(payload.businessId).select("_id");
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");

  const existing = await Saved.findOne({ user: userData.userId, business: payload.businessId });
  if (existing) {
    await existing.deleteOne();
    return { saved: false };
  }
  await Saved.create({ user: userData.userId, business: payload.businessId });
  return { saved: true };
};

const getAllSaved = async (userData: AuthUserPayload, query: QueryParams) => {
  const { meta, result } = await new QueryBuilder(
    Saved.find({ user: userData.userId })
      .populate([{ path: "business", select: "name logo category address ratingAvg ratingCount" }])
      .lean(),
    query,
  ).execute([]);
  return { meta, result };
};

const removeSaved = async (userData: AuthUserPayload, payload: { businessId?: string }) => {
  validateFields(payload, ["businessId"]);
  const result = await Saved.deleteOne({ user: userData.userId, business: payload.businessId });
  if (!result.deletedCount) throw new ApiError(status.NOT_FOUND, "Not in saved list");
  return { deleted: true };
};

const SavedService = { toggleSaved, getAllSaved, removeSaved };

export { SavedService };
