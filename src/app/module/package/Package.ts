import { Schema, model, Types } from "mongoose";

export interface IPackage {
  _id: Types.ObjectId;
  packageName: string;
  contentType: string; // Video | Story | Reel | Image
  duration?: string; // e.g. "15 Seconds", "30 Seconds"
  category?: Types.ObjectId;
  price: number;
  currency: string; // USD
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<IPackage>(
  {
    packageName: { type: String, required: true },
    contentType: { type: String, required: true, default: "Video" },
    duration: { type: String, default: "30 Seconds" },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

const Package = model<IPackage>("Package", packageSchema);
export default Package;
