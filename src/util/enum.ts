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

// Influencer campaign lifecycle: submitted campaigns wait for admin approval
// (pending_review) before creators can be assigned (live); merchant can pause
// or complete a live campaign; admin can reject a pending one.
const EnumCampaignStatus = {
  PENDING_REVIEW: "pending_review",
  LIVE: "live",
  REJECTED: "rejected",
  PAUSED: "paused",
  COMPLETED: "completed",
};

// What the campaign is meant to achieve (Figma: New Campaign > Objective)
const EnumCampaignObjective = {
  AWARENESS: "awareness",
  TRAFFIC: "traffic",
  OFFER: "offer",
  LEAD_GENERATION: "lead_generation",
};

// The format of content creators should produce (Figma: New Campaign > Content Type)
const EnumCampaignContentType = {
  VIDEO_AD: "video_ad",
  PRODUCT_REVIEW: "product_review",
  REEL: "reel",
  STORY: "story",
};

// Creator task lifecycle — created already-approved via campaign/admin/assign-creator
// (no self-service "applied" state): approved -> draft_submitted -> verifying -> published/rejected
const EnumTaskStatus = {
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

const EnumLanguage = {
  EN: "en",
  SO: "so",
  AR: "ar",
};

const EnumSupportStatus = {
  OPEN: "open",
  REPLIED: "replied",
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
  EnumCampaignObjective,
  EnumCampaignContentType,
  EnumTaskStatus,
  EnumSubscriptionStatus,
  EnumPayoutStatus,
  EnumSocialPlatform,
  EnumSupportStatus,
  EnumLanguage,
};
