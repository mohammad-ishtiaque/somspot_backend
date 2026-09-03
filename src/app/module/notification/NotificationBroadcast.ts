import { Schema, model, Types } from "mongoose";

// One row per admin broadcast action (Notifications > History tab). The
// actual per-recipient `Notification` rows are still created separately (one
// per user, for their own inbox) — this is just the campaign-level summary,
// which didn't exist before: `adminBroadcast` used to only write the
// per-recipient rows with no single record of "what was sent, to whom, when".
export interface INotificationBroadcast {
  _id: Types.ObjectId;
  title: string;
  message: string;
  audience: string; // ALL | USERS | MERCHANTS | CREATORS
  imageUrl?: string;
  recipientCount: number;
  status: "sent" | "scheduled" | "failed";
  scheduledAt?: Date;
  sentAt?: Date;
  sentBy?: Types.ObjectId; // Auth — the admin who created the broadcast
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationBroadcastSchema = new Schema<INotificationBroadcast>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    audience: { type: String, required: true, default: "ALL" },
    imageUrl: { type: String },
    recipientCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["sent", "scheduled", "failed"],
      default: "sent",
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    sentBy: { type: Schema.Types.ObjectId, ref: "Auth" },
    failureReason: { type: String },
  },
  { timestamps: true },
);

notificationBroadcastSchema.index({ status: 1, scheduledAt: 1 });

const NotificationBroadcast = model<INotificationBroadcast>(
  "NotificationBroadcast",
  notificationBroadcastSchema,
);

export default NotificationBroadcast;
