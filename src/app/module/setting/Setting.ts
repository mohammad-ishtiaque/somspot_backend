import { Schema, model, Types } from "mongoose";

export interface ILanguage {
  code: string; // so | en | ar
  name: string;
  enabled: boolean;
}

// Singleton platform settings (System Settings + Influencer Settings screens).
export interface ISetting {
  _id: Types.ObjectId;
  platformName: string;
  supportEmail?: string;
  verificationMode: string; // manual | auto
  commissionPercent: number; // platform cut on creator commissions
  withdrawalMin: number; // minimum creator withdrawal
  minFollowerThreshold: number; // min followers for creator verification
  languages: ILanguage[];
  createdAt: Date;
  updatedAt: Date;
}

const languageSchema = new Schema<ILanguage>(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const settingSchema = new Schema<ISetting>(
  {
    platformName: { type: String, default: "SomSpot" },
    supportEmail: { type: String },
    verificationMode: { type: String, enum: ["manual", "auto"], default: "manual" },
    commissionPercent: { type: Number, default: 0 },
    withdrawalMin: { type: Number, default: 10 },
    minFollowerThreshold: { type: Number, default: 1000 },
    languages: {
      type: [languageSchema],
      default: [
        { code: "so", name: "Somali", enabled: true },
        { code: "en", name: "English", enabled: true },
        { code: "ar", name: "Arabic", enabled: true },
      ],
    },
  },
  { timestamps: true },
);

const Setting = model<ISetting>("Setting", settingSchema);

export default Setting;
