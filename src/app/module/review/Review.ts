import { Schema, model, Types } from "mongoose";

export interface IReview {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  business: Types.ObjectId;
  rating: number;
  review: string;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, required: true },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// One review per user per business.
reviewSchema.index({ user: 1, business: 1 }, { unique: true });

const Review = model<IReview>("Review", reviewSchema);

export default Review;
