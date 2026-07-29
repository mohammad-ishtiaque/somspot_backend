import { Schema, model, Types } from "mongoose";
import { EnumCategoryType } from "../../../util/enum";

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  icon?: string;
  type: string; // EnumCategoryType — merchant (business categories) or creator (influencer niches)
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    // Not globally unique — "Fashion" can exist once as a merchant category
    // and once as a creator category. Uniqueness is enforced per type below.
    slug: { type: String, required: true, lowercase: true, trim: true },
    icon: { type: String },
    type: { type: String, enum: Object.values(EnumCategoryType), default: EnumCategoryType.MERCHANT },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ slug: 1, type: 1 }, { unique: true });

const Category = model<ICategory>("Category", categorySchema);

export default Category;
