import { Schema, model, Types } from "mongoose";
import { EnumPayoutStatus } from "../../../util/enum";

export interface IPayout {
  _id: Types.ObjectId;
  creator: Types.ObjectId; // User
  amount: number;
  status: string;
  method?: string;
  note?: string;
  requestedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const payoutSchema = new Schema<IPayout>(
  {
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: Object.values(EnumPayoutStatus),
      default: EnumPayoutStatus.PENDING,
    },
    method: { type: String },
    note: { type: String },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

const Payout = model<IPayout>("Payout", payoutSchema);

export default Payout;
