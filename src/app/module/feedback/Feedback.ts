import { Schema, model, Types } from "mongoose";
import { EnumSupportStatus } from "../../../util/enum";

// Support ticket (Figma: Help & Support → Subject + "Describe your issue").
export interface IFeedback {
  user?: Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  feedback: string; // the issue description
  reply?: string;
  status: string; // open | replied
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    feedback: { type: String, required: true },
    reply: { type: String },
    status: {
      type: String,
      enum: Object.values(EnumSupportStatus),
      default: EnumSupportStatus.OPEN,
    },
  },
  { timestamps: true },
);

const Feedback = model<IFeedback>("Feedback", feedbackSchema);

export default Feedback;
