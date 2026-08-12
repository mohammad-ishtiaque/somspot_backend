const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumBusinessStatus } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import SearchHistory from "./SearchHistory";
import Business from "../business/Business";

// Run a business search and record the term in the user's recent history.
const search = async (userData: AuthUserPayload, query: QueryParams) => {
  const searchTerm = String(query.term || query.searchTerm || query.q || "").trim();
  if (!searchTerm) {
    throw new ApiError(status.BAD_REQUEST, "Search term is required (term, searchTerm, or q)");
  }

  // De-duplicate: keep the most recent occurrence of a term at the top.
  if (userData?.userId) {
    await SearchHistory.deleteMany({ user: userData.userId, term: searchTerm });
    await SearchHistory.create({ user: userData.userId, term: searchTerm });
  }

  const searchableFields = ["name", "description", "address"];

  const searchFilter = {
    status: EnumBusinessStatus.APPROVED,
    $or: searchableFields.map((field) => ({
      [field]: { $regex: searchTerm, $options: "i" },
    })),
  };

  const { meta, result } = await new QueryBuilder(
    Business.find(searchFilter).populate([{ path: "category", select: "name slug icon" }]).lean(),
    query,
  ).execute([]);

  return { term: searchTerm, meta, result };
};

const getRecent = async (userData: AuthUserPayload) => {
  const result = await SearchHistory.find({ user: userData.userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  return result;
};

const clearRecent = async (userData: AuthUserPayload) => {
  const result = await SearchHistory.deleteMany({ user: userData.userId });
  return { cleared: result.deletedCount };
};

// Trending searches = most frequent terms across all users (last 30 days).
const getTrendingSearches = async () => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await SearchHistory.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $toLower: "$term" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, term: "$_id", count: 1 } },
  ]);
  return result;
};

const SearchService = { search, getRecent, clearRecent, getTrendingSearches };

export { SearchService };
