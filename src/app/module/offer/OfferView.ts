import { Schema, model, Types } from "mongoose";

// One row per offer-detail view. Mirrors `business/BusinessView.ts` — same
// pattern, scoped to individual offers instead of businesses. Powers the
// "Offer Engagement" trend on the admin Analytics page, since there is no
// other view/impression tracking for offers.
export interface IOfferView {
  _id: Types.ObjectId;
  offer: Types.ObjectId;
  viewer?: Types.ObjectId; // User, when the viewer is logged in
  ip?: string; // dedupe signal for guest viewers (no viewer id)
  createdAt: Date;
}

const offerViewSchema = new Schema<IOfferView>(
  {
    offer: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    viewer: { type: Schema.Types.ObjectId, ref: "User" },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

offerViewSchema.index({ offer: 1, createdAt: -1 });
offerViewSchema.index({ createdAt: -1 });

const OfferView = model<IOfferView>("OfferView", offerViewSchema);

export default OfferView;
