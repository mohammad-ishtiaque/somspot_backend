import { Schema, model, Types } from "mongoose";

export interface ISaved {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  business?: Types.ObjectId;
  offer?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const savedSchema = new Schema<ISaved>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    business: { type: Schema.Types.ObjectId, ref: "Business" },
    offer: { type: Schema.Types.ObjectId, ref: "Offer" },
  },
  { timestamps: true },
);

savedSchema.index(
  { user: 1, business: 1 },
  { unique: true, partialFilterExpression: { business: { $exists: true } } },
);
savedSchema.index(
  { user: 1, offer: 1 },
  { unique: true, partialFilterExpression: { offer: { $exists: true } } },
);

const Saved = model<ISaved>("Saved", savedSchema);

export default Saved;
