import { Schema, model, Types } from "mongoose";
import { EnumTaskStatus, EnumSocialPlatform, EnumContentMediaType } from "../../../util/enum";

// A creator's participation in a campaign — created already-approved by an
// admin (campaign/admin/assign-creator), then carries the task lifecycle:
// approved -> draft_submitted -> verifying -> published (or rejected).
export interface ICampaignApplication {
  _id: Types.ObjectId;
  campaign: Types.ObjectId;
  creator: Types.ObjectId; // User
  status: string;
  pitch?: string; // "Tell the merchant why your audience would love this offer"
  platform?: string; // EnumSocialPlatform — which platform this content is for (Figma: "TikTok Video" badge)
  draftVideoUrl?: string;
  thumbnail?: string;
  draftMediaType?: string; // EnumContentMediaType — Figma "Upload Video" vs "Upload Image"; field name predates images
  caption?: string; // social caption the creator posts alongside the video
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
      default: EnumTaskStatus.APPROVED,
    },
    pitch: { type: String },
    platform: { type: String, enum: Object.values(EnumSocialPlatform) },
    draftVideoUrl: { type: String },
    thumbnail: { type: String },
    draftMediaType: { type: String, enum: Object.values(EnumContentMediaType) },
    caption: { type: String },
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
