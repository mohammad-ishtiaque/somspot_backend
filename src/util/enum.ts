const EnumUserRole = {
  USER: "USER",
  DRIVER: "DRIVER",
  MERCHANT: "MERCHANT",
  CREATOR: "CREATOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
};

const EnumPaymentStatus = {
  SUCCEEDED: "succeeded",
  UNPAID: "unpaid",
};

const EnumSocketEvent = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  SOCKET_ERROR: "socket_error",
  ONLINE_STATUS: "online_status",
  UPDATE_LOCATION: "update_location",

  START_CHAT: "start_chat",
  SEND_MESSAGE: "send_message",
};

const EnumLoginProvider = {
  LOCAL: "local",
  PHONE: "phone",
  GOOGLE: "google",
  APPLE: "apple",
};

const EnumUserAccountStatus = {
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
};

// ---- SomSpot domain enums ----

// Merchant business verification lifecycle (Figma: pending -> approved/rejected)
const EnumBusinessStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

// High level business categories shown in the discover UI
const EnumBusinessCategory = {
  RESTAURANT: "restaurant",
  GROCERY: "grocery",
  PHARMACY: "pharmacy",
  SUPERMARKET: "supermarket",
  CAFE: "cafe",
  ELECTRONICS: "electronics",
};

// Offer/deal lifecycle
const EnumOfferStatus = {
  ACTIVE: "active",
  EXPIRED: "expired",
  INACTIVE: "inactive",
};

// A user's claimed offer ("wallet") lifecycle
const EnumClaimStatus = {
  CLAIMED: "claimed",
  REDEEMED: "redeemed",
  EXPIRED: "expired",
};

// Influencer campaign lifecycle
const EnumCampaignStatus = {
  DRAFT: "draft",
  LIVE: "live",
  PAUSED: "paused",
  COMPLETED: "completed",
};

// Creator task/application lifecycle (Figma: applied -> approved -> submitted -> verifying -> published/rejected)
const EnumTaskStatus = {
  APPLIED: "applied",
  APPROVED: "approved",
  DRAFT_SUBMITTED: "draft_submitted",
  VERIFYING: "verifying",
  PUBLISHED: "published",
  REJECTED: "rejected",
};

// Merchant subscription (mirrors RevenueCat entitlement state)
const EnumSubscriptionStatus = {
  ACTIVE: "active",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  NONE: "none",
};

// Creator earnings payout lifecycle (ledger only, no real rail wired yet)
const EnumPayoutStatus = {
  PENDING: "pending",
  PAID: "paid",
  REJECTED: "rejected",
};

const EnumSocialPlatform = {
  TIKTOK: "tiktok",
  INSTAGRAM: "instagram",
};

export {
  EnumUserRole,
  EnumPaymentStatus,
  EnumSocketEvent,
  EnumLoginProvider,
  EnumUserAccountStatus,
  EnumBusinessStatus,
  EnumBusinessCategory,
  EnumOfferStatus,
  EnumClaimStatus,
  EnumCampaignStatus,
  EnumTaskStatus,
  EnumSubscriptionStatus,
  EnumPayoutStatus,
  EnumSocialPlatform,
};
