import { Schema, model, Types } from "mongoose";
import { EnumTaskStatus } from "../../../util/enum";

// A creator's participation in a campaign — carries the whole task lifecycle:
// applied -> approved -> draft_submitted -> verifying -> published (or rejected).
export interface ICampaignApplication {
  _id: Types.ObjectId;
  campaign: Types.ObjectId;
  creator: Types.ObjectId; // User
  status: string;
  pitch?: string; // "Tell the merchant why your audience would love this offer"
  draftVideoUrl?: string;
  postUrl?: string; // live TikTok/IG URL
  merchantNote?: string;
  draftApproved: boolean;
  commissionAmount: number;
  appliedAt: Date;
  approvedAt?: Date;
  submittedAt?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<ICampaignApplication>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(EnumTaskStatus),
      default: EnumTaskStatus.APPLIED,
    },
    pitch: { type: String },
    draftVideoUrl: { type: String },
    postUrl: { type: String },
    merchantNote: { type: String },
    draftApproved: { type: Boolean, default: false },
    commissionAmount: { type: Number, default: 0 },
    appliedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    submittedAt: { type: Date },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

applicationSchema.index({ campaign: 1, creator: 1 }, { unique: true });

const CampaignApplication = model<ICampaignApplication>(
  "CampaignApplication",
  applicationSchema,
);

export default CampaignApplication;
