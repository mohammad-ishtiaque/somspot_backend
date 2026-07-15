import { Schema, model, Types } from "mongoose";

// "Rate SomSpot" — a star rating of the app itself (distinct from business reviews).
export interface IAppRating {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appRatingSchema = new Schema<IAppRating>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
  },
  { timestamps: true },
);

const AppRating = model<IAppRating>("AppRating", appRatingSchema);

export default AppRating;
