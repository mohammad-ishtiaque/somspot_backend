const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumUserRole } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Review from "./Review";
import Business from "../business/Business";

const isPrivileged = (role: string) =>
  role === EnumUserRole.ADMIN || role === EnumUserRole.SUPER_ADMIN;

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

  const reviewQuery = new QueryBuilder(
    Review.find(queryObj)
      .populate([
        { path: "user", select: "name profile_image" },
        { path: "business", select: "name logo" },
      ])
      .lean(),
    query,
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([reviewQuery.modelQuery, reviewQuery.countTotal()]);
  return { meta, result };
};

// Public: all reviews for one business (business detail "Reviews" tab).
const getBusinessReviews = async (query: QueryParams) => {
  validateFields(query, ["businessId"]);
  const reviewQuery = new QueryBuilder(
    Review.find({ business: query.businessId })
      .populate([{ path: "user", select: "name profile_image" }])
      .lean(),
    query,
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([reviewQuery.modelQuery, reviewQuery.countTotal()]);
  return { meta, result };
};

const getReview = async (_userData: AuthUserPayload, query: { reviewId?: string }) => {
  validateFields(query, ["reviewId"]);
  const review = await Review.findById(query.reviewId)
    .populate([{ path: "user", select: "name profile_image" }])
    .lean();
  if (!review) throw new ApiError(status.NOT_FOUND, "Review not found");
  return review;
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

const ReviewService = {
  postReview,
  getAllReviews,
  getBusinessReviews,
  getReview,
  updateReview,
  deleteReview,
};

export { ReviewService };
