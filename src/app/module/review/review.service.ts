const { status } = require("http-status");
import { isPrivileged } from "../../../util/authz";
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumUserRole } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Review from "./Review";
import Business from "../business/Business";

// Recompute a business's rating average + count from its reviews.
const recomputeBusinessRating = async (businessId: unknown) => {
  const [agg] = await Review.aggregate([
    { $match: { business: (await import("mongoose")).Types.ObjectId.createFromHexString(String(businessId)) } },
    { $group: { _id: "$business", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Business.updateOne(
    { _id: businessId },
    {
      $set: {
        ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0,
        ratingCount: agg ? agg.count : 0,
      },
    },
  );
};

const postReview = async (userData: AuthUserPayload, payload: Record<string, any>) => {
  validateFields(payload, ["business", "rating", "review"]);

  const business = await Business.findById(payload.business).select("_id");
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");

  const exists = await Review.findOne({ user: userData.userId, business: payload.business });
  if (exists) throw new ApiError(status.CONFLICT, "You already reviewed this business");

  const review = await Review.create({
    user: userData.userId,
    business: payload.business,
    rating: payload.rating,
    review: payload.review,
  });

  await recomputeBusinessRating(payload.business);
  return review;
};

const getAllReviews = async (userData: AuthUserPayload, query: QueryParams) => {
  const queryObj = isPrivileged(userData.role) ? {} : { user: userData.userId };

  const { meta, result } = await new QueryBuilder(
    Review.find(queryObj)
      .populate([
        { path: "user", select: "name profile_image" },
        { path: "business", select: "name logo" },
      ])
      .lean(),
    query,
  ).execute([]);

  const targetUserId = userData?.userId;
  const enrichedResult = result.map((r: any) => {
    let isHelpful = false;
    if (targetUserId && Array.isArray(r.helpfulUsers)) {
      isHelpful = r.helpfulUsers.some((id: any) => String(id) === String(targetUserId));
    }
    const helpfulCount = r.helpfulCount ?? (Array.isArray(r.helpfulUsers) ? r.helpfulUsers.length : 0);
    const { helpfulUsers, ...rest } = r;
    return {
      ...rest,
      helpfulCount,
      isHelpful,
    };
  });

  return { meta, result: enrichedResult };
};

const getBusinessReviews = async (query: QueryParams, userData?: AuthUserPayload) => {
  const { businessId, business: qBusiness, id, ...restQuery } = query;
  const targetBusinessId = businessId || qBusiness || id;
  if (!targetBusinessId) throw new ApiError(status.BAD_REQUEST, "businessId is required");

  const business = await Business.findById(targetBusinessId).select("ratingAvg ratingCount");
  if (!business) throw new ApiError(status.NOT_FOUND, "Business not found");

  const { meta, result } = await new QueryBuilder(
    Review.find({ business: targetBusinessId, moderationStatus: { $ne: "hidden" } })
      .populate([{ path: "user", select: "name profile_image" }])
      .lean(),
    restQuery,
  ).execute([]);

  const targetUserId = userData?.userId;
  const enrichedResult = result.map((r: any) => {
    let isHelpful = false;
    if (targetUserId && Array.isArray(r.helpfulUsers)) {
      isHelpful = r.helpfulUsers.some((id: any) => String(id) === String(targetUserId));
    }
    const helpfulCount = r.helpfulCount ?? (Array.isArray(r.helpfulUsers) ? r.helpfulUsers.length : 0);
    const { helpfulUsers, ...rest } = r; // exclude helpfulUsers array from response for payload size
    return {
      ...rest,
      helpfulCount,
      isHelpful,
    };
  });

  return { meta, businessRating: { avg: business.ratingAvg || 0, count: business.ratingCount || 0 }, result: enrichedResult };
};

const toggleHelpful = async (userData: AuthUserPayload, payload: { reviewId?: string }) => {
  validateFields(payload, ["reviewId"]);
  const review = await Review.findById(payload.reviewId);
  if (!review) throw new ApiError(status.NOT_FOUND, "Review not found");

  const userId = userData.userId as any;
  const index = review.helpfulUsers.findIndex((id) => String(id) === String(userId));
  
  if (index === -1) {
    review.helpfulUsers.push(userId);
  } else {
    review.helpfulUsers.splice(index, 1);
  }
  
  review.helpfulCount = review.helpfulUsers.length;
  await review.save();

  return {
    isHelpful: index === -1,
    helpfulCount: review.helpfulCount,
  };
};

const getReview = async (userData: AuthUserPayload, query: { reviewId?: string }) => {
  validateFields(query, ["reviewId"]);
  const review = await Review.findById(query.reviewId)
    .populate([{ path: "user", select: "name profile_image" }])
    .lean();
  if (!review) throw new ApiError(status.NOT_FOUND, "Review not found");

  const targetUserId = userData?.userId;
  let isHelpful = false;
  if (targetUserId && Array.isArray((review as any).helpfulUsers)) {
    isHelpful = (review as any).helpfulUsers.some((id: any) => String(id) === String(targetUserId));
  }
  const helpfulCount = (review as any).helpfulCount ?? (Array.isArray((review as any).helpfulUsers) ? (review as any).helpfulUsers.length : 0);
  const { helpfulUsers, ...rest } = review as any;

  return {
    ...rest,
    helpfulCount,
    isHelpful,
  };
};

const updateReview = async (userData: AuthUserPayload, payload: Record<string, unknown>) => {
  validateFields(payload, ["reviewId"]);
  const review = await Review.findById(payload.reviewId);
  if (!review) throw new ApiError(status.NOT_FOUND, "Review not found");
  if (String(review.user) !== userData.userId && !isPrivileged(userData.role))
    throw new ApiError(status.FORBIDDEN, "Not your review");

  if (payload.rating !== undefined) review.rating = Number(payload.rating);
  if (payload.review !== undefined) review.review = String(payload.review);
  await review.save();

  await recomputeBusinessRating(review.business);
  return review;
};

const deleteReview = async (userData: AuthUserPayload, payload: { reviewId?: string }) => {
  validateFields(payload, ["reviewId"]);
  const review = await Review.findById(payload.reviewId);
  if (!review) throw new ApiError(status.NOT_FOUND, "Review not found");
  if (String(review.user) !== userData.userId && !isPrivileged(userData.role))
    throw new ApiError(status.FORBIDDEN, "Not your review");

  const businessId = review.business;
  await review.deleteOne();
  await recomputeBusinessRating(businessId);
  return { deleted: true };
};


import postNotification from "../../../util/postNotification";

// Admin review moderation (Figma: Approve / Hide / Delete).
const adminModerate = async (payload: { reviewId?: string; action?: string }) => {
  validateFields(payload, ["reviewId", "action"]);
  const review = await Review.findById(payload.reviewId).populate("business", "name");
  if (!review) throw new ApiError(status.NOT_FOUND, "Review not found");

  if (payload.action === "approve") {
    review.moderationStatus = "visible";
    await review.save();
    postNotification("Review Approved", `Your review for ${(review.business as any)?.name} is now visible.`, String(review.user));
  } else if (payload.action === "hide") {
    review.moderationStatus = "hidden";
    await review.save();
    postNotification("Review Hidden", `Your review for ${(review.business as any)?.name} was hidden by a moderator.`, String(review.user));
  } else if (payload.action === "delete") {
    const businessId = review.business;
    const business = await Business.findById(businessId).select("name");
    await review.deleteOne();
    await recomputeBusinessRating(businessId);
    postNotification("Review Deleted", `Your review for ${business?.name} was deleted by a moderator.`, String(review.user));
    return { deleted: true };
  } else {
    throw new ApiError(status.BAD_REQUEST, "action must be approve, hide or delete");
  }
  return review;
};

const ReviewService = {
  postReview,
  getAllReviews,
  getBusinessReviews,
  toggleHelpful,
  getReview,
  updateReview,
  deleteReview,
  adminModerate,
};

export { ReviewService };
