import { Schema, model, Types } from "mongoose";
import { EnumOfferStatus } from "../../../util/enum";

export interface IOffer {
  _id: Types.ObjectId;
  business: Types.ObjectId;
  title: string;
  description?: string;
  discountLabel?: string; // e.g. "20%", "Buy 1 Get 1"
  terms?: string;
  startAt?: Date;
  endAt: Date;
  status: string;
  claimLimitPerUser: number;
  totalClaims: number;
  estimatedValue: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    discountLabel: { type: String },
    terms: { type: String },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(EnumOfferStatus),
      default: EnumOfferStatus.ACTIVE,
    },
    claimLimitPerUser: { type: Number, default: 1 },
    totalClaims: { type: Number, default: 0 },
    estimatedValue: { type: Number, default: 0 }, // avg $ value per redemption, for merchant revenue estimate
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

offerSchema.index({ business: 1, status: 1 });

const Offer = model<IOffer>("Offer", offerSchema);

export default Offer;
