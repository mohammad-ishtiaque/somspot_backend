import { Schema, model, Types } from "mongoose";

export interface ISaved {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  business: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const savedSchema = new Schema<ISaved>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    business: { type: Schema.Types.ObjectId, ref: "Business", required: true },
  },
  { timestamps: true },
);

savedSchema.index({ user: 1, business: 1 }, { unique: true });

const Saved = model<ISaved>("Saved", savedSchema);

export default Saved;
