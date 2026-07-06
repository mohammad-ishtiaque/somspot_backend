import { Schema, model, Types } from "mongoose";

// A subscription transaction, recorded from RevenueCat webhook events.
export interface IPayment {
  _id: Types.ObjectId;
  merchant: Types.ObjectId; // User (RevenueCat app_user_id)
  transactionId: string;
  productId?: string;
  store?: string;
  eventType?: string; // INITIAL_PURCHASE | RENEWAL | ...
  price: number;
  currency: string;
  purchasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    merchant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    transactionId: { type: String, required: true, unique: true },
    productId: { type: String },
    store: { type: String },
    eventType: { type: String },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    purchasedAt: { type: Date },
  },
  { timestamps: true },
);

const Payment = model<IPayment>("Payment", paymentSchema);

export default Payment;
