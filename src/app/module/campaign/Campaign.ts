import { Schema, model, Types } from "mongoose";
import { EnumCampaignStatus, EnumCampaignObjective, EnumCampaignContentType } from "../../../util/enum";

export interface ICampaign {
  _id: Types.ObjectId;
  merchant: Types.ObjectId; // owning User
  business: Types.ObjectId;
  offer?: Types.ObjectId;
  name: string;
  about?: string; // Figma: "Description"
  goal?: string; // Figma: "Campaign Goal" — distinct from the description
  objective?: string; // EnumCampaignObjective
  contentType?: string; // EnumCampaignContentType
  influencerCategory?: Types.ObjectId; // ref Category (type: creator) — what kind of creator the merchant wants
  startDate?: Date;
  endDate?: Date;
  contentRequirements?: string; // Figma: "Content Requirements" / "Campaign Requirements"
  invitedCreator?: Types.ObjectId; // ref User — optional note of who the merchant has in mind; actual task assignment happens via admin/assign-creator
  videoLengthSec: number; // 20 | 30 | 45 | 60
  targetCreators: number;
  pricePerClaim: number; // fixed platform price for the chosen videoLengthSec tier — not merchant-editable
  status: string;
  rejectionReason?: string;
  approvedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    merchant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    offer: { type: Schema.Types.ObjectId, ref: "Offer" },
    name: { type: String, required: true, trim: true },
    about: { type: String },
    goal: { type: String },
    objective: { type: String, enum: Object.values(EnumCampaignObjective) },
    contentType: { type: String, enum: Object.values(EnumCampaignContentType) },
    influencerCategory: { type: Schema.Types.ObjectId, ref: "Category" },
    startDate: { type: Date },
    endDate: { type: Date },
    contentRequirements: { type: String },
    invitedCreator: { type: Schema.Types.ObjectId, ref: "User" },
    videoLengthSec: { type: Number, enum: [20, 30, 45, 60], default: 30 },
    targetCreators: { type: Number, default: 1, min: 1 },
    pricePerClaim: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(EnumCampaignStatus),
      default: EnumCampaignStatus.PENDING_REVIEW,
    },
    rejectionReason: { type: String },
    approvedCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Campaign = model<ICampaign>("Campaign", campaignSchema);

export default Campaign;
