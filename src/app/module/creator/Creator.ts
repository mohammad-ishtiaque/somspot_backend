import { Schema, model, Types } from "mongoose";
import { EnumSocialPlatform } from "../../../util/enum";

export interface ISocialAccount {
  platform: string; // tiktok | instagram
  handle: string;
  url?: string;
  verified: boolean;
}

export interface ICreator {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  bio?: string;
  socials: ISocialAccount[];
  createdAt: Date;
  updatedAt: Date;
}

const socialSchema = new Schema<ISocialAccount>(
  {
    platform: { type: String, enum: Object.values(EnumSocialPlatform), required: true },
    handle: { type: String, required: true },
    url: { type: String },
    verified: { type: Boolean, default: false },
  },
  { _id: false },
);

const creatorSchema = new Schema<ICreator>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String },
    socials: { type: [socialSchema], default: [] },
  },
  { timestamps: true },
);

const Creator = model<ICreator>("Creator", creatorSchema);

export default Creator;
