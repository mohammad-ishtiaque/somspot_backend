import { Schema, model, Types } from "mongoose";
import { EnumClaimStatus } from "../../../util/enum";

export interface IClaim {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  offer: Types.ObjectId;
  business: Types.ObjectId;
  code: string; // e.g. "SOM-842"
  status: string;
  claimedAt: Date;
  redeemedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const claimSchema = new Schema<IClaim>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    offer: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    code: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: Object.values(EnumClaimStatus),
      default: EnumClaimStatus.CLAIMED,
    },
    claimedAt: { type: Date, default: Date.now },
    redeemedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

claimSchema.index({ user: 1, status: 1 });

const Claim = model<IClaim>("Claim", claimSchema);

export default Claim;
