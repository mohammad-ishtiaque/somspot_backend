import { Schema, model, Types } from "mongoose";

// Creator earnings ledger entry (accrual). Payout execution is tracked
// separately in Payout; no real money rail is wired yet.
export interface IEarning {
  _id: Types.ObjectId;
  creator: Types.ObjectId; // User
  campaign: Types.ObjectId;
  application: Types.ObjectId;
  amount: number;
  status: "available" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

const earningSchema = new Schema<IEarning>(
  {
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    application: { type: Schema.Types.ObjectId, ref: "CampaignApplication", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["available", "paid"], default: "available" },
  },
  { timestamps: true },
);

earningSchema.index({ creator: 1, createdAt: -1 });

const Earning = model<IEarning>("Earning", earningSchema);

export default Earning;
