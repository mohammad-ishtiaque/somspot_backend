const status = require("http-status");
// import { default: status } from "http-status";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import { EnumUserRole } from "../../../util/enum";
import AdminNotification from "./AdminNotification";
import Notification from "./Notification";
import NotificationBroadcast from "./NotificationBroadcast";
import Auth from "../auth/Auth";
import User from "../user/User";
import { AuthUserPayload } from "../../../types/auth.types";
import { IAdminNotification } from "./AdminNotification.interface";
import { INotification } from "./Notification.interface";
import { logger } from "../../../util/logger";

const getNotification = async (
  userData: AuthUserPayload,
  query: Record<string, unknown>,
) => {
  const { role } = userData;
  if (role !== EnumUserRole.ADMIN) validateFields(query, ["notificationId"]);

  if (role === EnumUserRole.ADMIN) {
    const notification = await AdminNotification.findOne({}).lean();
    if (!notification) {
      throw new ApiError(status.NOT_FOUND, "Notification not found");
    }
    return notification;
  }

  const notification = await Notification.findOne({
    _id: query.notificationId,
  }).lean();
  if (!notification) {
    throw new ApiError(status.NOT_FOUND, "Notification not found");
  }
  return notification;
};

/**
 * Retrieves notifications based on the user's role.
 *
 * - If the user is an **admin**, it fetches all notifications from `AdminNotification`.
 * - If the user is a **regular user**, it fetches only notifications relevant to them from `Notification`.
 */
const getAllNotifications = async (
  userData: AuthUserPayload,
  query: QueryParams,
) => {
  const { role, userId } = userData;

  if (role === EnumUserRole.ADMIN) {
    const { meta, result } = await new QueryBuilder(
    AdminNotification.find().lean(),
    query,
  ).execute([]);

    if (!result) {
      throw new ApiError(status.NOT_FOUND, "Notifications not found");
    }

    return { meta, result };
  } else {
    const { meta, result } = await new QueryBuilder(
    Notification.find({ toId: userId }).lean(),
    query,
  ).execute([]);

    if (!result) {
      throw new ApiError(status.NOT_FOUND, "Notifications not found");
    }

    return { meta, result };
  }
};

const updateAsReadUnread = async (
  userData: AuthUserPayload,
  payload: Record<string, unknown>,
) => {
  const { role } = userData;

  if (role === EnumUserRole.ADMIN) {
    const result = await AdminNotification.updateMany(
      {},
      {
        $set: { isRead: payload.isRead },
      },
    );

    if (!result.modifiedCount) {
      throw new ApiError(status.BAD_REQUEST, "Already updated");
    }

    return result;
  }

  const result = await Notification.updateMany(
    {
      toId: userData.userId,
    },
    {
      $set: { isRead: payload.isRead },
    },
  );

  if (!result.modifiedCount) {
    throw new ApiError(status.BAD_REQUEST, "Already updated");
  }

  return result;
};

const deleteNotification = async (
  userData: AuthUserPayload,
  payload: Record<string, unknown>,
) => {
  const { role } = userData;
  validateFields(payload, ["notificationId"]);

  if (role === EnumUserRole.ADMIN) {
    const result = await AdminNotification.findByIdAndDelete(
      payload.notificationId,
    );
    if (!result) {
      throw new ApiError(status.NOT_FOUND, "Notification not found");
    }
    return result;
  }

  const result = await Notification.findByIdAndDelete(payload.notificationId);
  if (!result) {
    throw new ApiError(status.NOT_FOUND, "Notification not found");
  }
  return result;
};


const AUDIENCE_ROLE_MAP: Record<string, string[]> = {
  ALL: [EnumUserRole.USER, EnumUserRole.MERCHANT, EnumUserRole.CREATOR],
  USERS: [EnumUserRole.USER],
  MERCHANTS: [EnumUserRole.MERCHANT],
  INFLUENCERS: [EnumUserRole.CREATOR],
  CREATORS: [EnumUserRole.CREATOR],
};

// Resolved fresh (not snapshotted at broadcast-creation time) so a scheduled
// broadcast reaches whoever matches the audience *when it actually sends*.
const resolveAudienceUserIds = async (audience: string) => {
  const roles = AUDIENCE_ROLE_MAP[audience.toUpperCase()] || AUDIENCE_ROLE_MAP.ALL;
  const auths = await Auth.find({ role: { $in: roles } }).select("_id").lean();
  const users = await User.find({ authId: { $in: auths.map((a) => a._id) } }).select("_id").lean();
  return users.map((u) => u._id);
};

// Admin broadcast to an audience (Figma: Users / Merchants / Influencers / All).
// `scheduledAt` in the future defers sending to the per-minute cron below
// instead of writing per-recipient Notification rows immediately. Either way,
// a `NotificationBroadcast` summary row is written — the History tab's source.
const adminBroadcast = async (
  userData: AuthUserPayload | undefined,
  payload: { title?: string; message?: string; audience?: string; imageUrl?: string; scheduledAt?: string },
) => {
  validateFields(payload, ["title", "message"]);
  const audience = (payload.audience || "all").toUpperCase();
  const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : null;

  if (scheduledAt && scheduledAt.getTime() > Date.now()) {
    const broadcast = await NotificationBroadcast.create({
      title: payload.title,
      message: payload.message,
      audience,
      imageUrl: payload.imageUrl,
      status: "scheduled",
      scheduledAt,
      sentBy: userData?.authId,
    });
    return { scheduled: true, broadcastId: broadcast._id, scheduledAt };
  }

  const userIds = await resolveAudienceUserIds(audience);
  const docs = userIds.map((id) => ({
    toId: id,
    title: payload.title,
    message: payload.message,
    imageUrl: payload.imageUrl,
  }));
  if (docs.length) await Notification.insertMany(docs);

  await NotificationBroadcast.create({
    title: payload.title,
    message: payload.message,
    audience,
    imageUrl: payload.imageUrl,
    status: "sent",
    recipientCount: docs.length,
    sentAt: new Date(),
    sentBy: userData?.authId,
  });

  return { sent: docs.length, audience };
};

// Admin "Notification History" tab.
const adminGetBroadcasts = async (query: QueryParams) => {
  const { meta, result } = await new QueryBuilder(
    NotificationBroadcast.find({}).lean(),
    query,
  ).execute(["title", "message"]);
  return { meta, result };
};

// Cron body: send any broadcast whose scheduled time has arrived. A failure
// for one broadcast (e.g. a bad audience) doesn't block the others.
const sendDueScheduledBroadcasts = async () => {
  const due = await NotificationBroadcast.find({
    status: "scheduled",
    scheduledAt: { $lte: new Date() },
  }).lean();

  for (const broadcast of due) {
    try {
      const userIds = await resolveAudienceUserIds(broadcast.audience);
      const docs = userIds.map((id) => ({
        toId: id,
        title: broadcast.title,
        message: broadcast.message,
        imageUrl: broadcast.imageUrl,
      }));
      if (docs.length) await Notification.insertMany(docs);

      await NotificationBroadcast.updateOne(
        { _id: broadcast._id },
        { $set: { status: "sent", recipientCount: docs.length, sentAt: new Date() } },
      );
    } catch (error) {
      await NotificationBroadcast.updateOne(
        { _id: broadcast._id },
        { $set: { status: "failed", failureReason: error instanceof Error ? error.message : "Unknown error" } },
      );
    }
  }
};

// node-cron ships as an ESM-only package.json; a dynamic import lets a CJS
// build load it (see auth.service.ts for the same pattern / TS1479).
import("node-cron").then(({ default: cron }) => {
  cron.schedule("* * * * *", async () => {
    try {
      await sendDueScheduledBroadcasts();
    } catch (error) {
      logger.error("Error sending scheduled notification broadcasts:", error);
    }
  });
});

const NotificationService = {
  getNotification,
  getAllNotifications,
  updateAsReadUnread,
  deleteNotification,
  adminBroadcast,
  adminGetBroadcasts,
};

export { NotificationService };
