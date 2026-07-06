import { Schema, model, Types } from "mongoose";

export interface ISearchHistory {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  term: string;
  createdAt: Date;
  updatedAt: Date;
}

const searchHistorySchema = new Schema<ISearchHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    term: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

searchHistorySchema.index({ user: 1, createdAt: -1 });

const SearchHistory = model<ISearchHistory>("SearchHistory", searchHistorySchema);

export default SearchHistory;
