import { Schema, model } from "mongoose";
import type { IBusiness } from "./business.interface";
import { EnumBusinessStatus } from "../../../util/enum";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const openingHourSchema = new Schema(
  {
    day: { type: String, enum: WEEKDAYS, required: true },
    open: { type: String, required: true }, // "HH:mm" local
    close: { type: String, required: true },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const businessSchema = new Schema<IBusiness>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    description: { type: String },
    logo: { type: String },
    coverImage: { type: String },
    gallery: { type: [String], default: [] },
    phone: { type: String },
    whatsapp: { type: String },
    address: { type: String },
    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
    openingHours: { type: [openingHourSchema], default: [] },
    timezone: { type: String, default: "Africa/Mogadishu" },
    status: {
      type: String,
      enum: Object.values(EnumBusinessStatus),
      default: EnumBusinessStatus.PENDING,
    },
    rejectionReason: { type: String },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

businessSchema.index({ location: "2dsphere" });
businessSchema.index({ name: "text", description: "text" });

const Business = model<IBusiness>("Business", businessSchema);

export default Business;
