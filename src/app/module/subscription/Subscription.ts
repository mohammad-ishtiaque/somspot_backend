import { Schema, model, Types } from "mongoose";
import { EnumSubscriptionStatus } from "../../../util/enum";

// Mirrors a merchant's RevenueCat entitlement state. Source of truth is
// RevenueCat; we keep a local projection updated via webhooks for gating.
export interface ISubscription {
  _id: Types.ObjectId;
  merchant: Types.ObjectId; // User; equals RevenueCat app_user_id
  rcAppUserId: string;
  entitlement?: string;
  productId?: string;
  store?: string;
  status: string;
  currentPeriodEnd?: Date;
  lastEvent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    merchant: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    rcAppUserId: { type: String, required: true, index: true },
    entitlement: { type: String },
    productId: { type: String },
    store: { type: String },
    status: {
      type: String,
      enum: Object.values(EnumSubscriptionStatus),
      default: EnumSubscriptionStatus.NONE,
    },
    currentPeriodEnd: { type: Date },
    lastEvent: { type: String },
  },
  { timestamps: true },
);

const Subscription = model<ISubscription>("Subscription", subscriptionSchema);

export default Subscription;
