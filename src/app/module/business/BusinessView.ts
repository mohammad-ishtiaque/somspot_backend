import { Schema, model, Types } from "mongoose";

// One row per business-detail view. Powers the merchant dashboard's Activity
// Summary (Visitors / Unique Users / Engagement / Bounce Rate) — there is no
// other analytics/session tracking in the app, so this is the whole source
// of truth for those metrics.
export interface IBusinessView {
  _id: Types.ObjectId;
  business: Types.ObjectId;
  viewer?: Types.ObjectId; // User, when the viewer is logged in
  ip?: string; // dedupe key for guest viewers (no viewer id)
  createdAt: Date;
}

const businessViewSchema = new Schema<IBusinessView>(
  {
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    viewer: { type: Schema.Types.ObjectId, ref: "User" },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

businessViewSchema.index({ business: 1, createdAt: -1 });

const BusinessView = model<IBusinessView>("BusinessView", businessViewSchema);

export default BusinessView;
