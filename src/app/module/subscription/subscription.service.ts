const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import { EnumSubscriptionStatus } from "../../../util/enum";
import { AuthUserPayload } from "../../../types/auth.types";
import Subscription from "./Subscription";
import { PaymentService } from "../payment/payment.service";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";

// Static plan catalogue shown on the merchant "Choose a Plan" screen. Real
// pricing/products live in RevenueCat; this is display + productId mapping.
const PLANS = [
  {
    id: "somspot_pro_monthly",
    name: "Pro",
    interval: "month",
    features: ["Unlimited offers", "Advanced analytics", "Influencer campaigns"],
  },
  {
    id: "somspot_pro_yearly",
    name: "Pro (Annual)",
    interval: "year",
    features: ["Unlimited offers", "Advanced analytics", "Influencer campaigns", "2 months free"],
  },
];

const getPlans = async () => PLANS;

const getMySubscription = async (userData: AuthUserPayload) => {
  const sub = await Subscription.findOne({ merchant: userData.userId }).lean();
  return (
    sub ||
    ({
      merchant: userData.userId,
      status: EnumSubscriptionStatus.NONE,
      entitlement: null,
    } as unknown as typeof sub)
  );
};

// Used by other modules (e.g. campaigns) to gate premium merchant actions.
const hasActiveEntitlement = async (userId: string): Promise<boolean> => {
  const sub = await Subscription.findOne({ merchant: userId }).lean();
  if (!sub) return false;
  if (sub.status !== EnumSubscriptionStatus.ACTIVE) return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return false;
  return true;
};

// Maps a RevenueCat webhook event to local subscription state.
const handleWebhook = async (body: Record<string, any>) => {
  const event = body?.event;
  if (!event || !event.app_user_id)
    throw new ApiError(status.BAD_REQUEST, "Invalid webhook payload");

  const activeTypes = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"];
  const inactiveTypes = ["CANCELLATION", "EXPIRATION"];

  let nextStatus = EnumSubscriptionStatus.NONE;
  if (activeTypes.includes(event.type)) nextStatus = EnumSubscriptionStatus.ACTIVE;
  else if (event.type === "CANCELLATION") nextStatus = EnumSubscriptionStatus.CANCELLED;
  else if (event.type === "EXPIRATION") nextStatus = EnumSubscriptionStatus.EXPIRED;
  else if (inactiveTypes.includes(event.type)) nextStatus = EnumSubscriptionStatus.EXPIRED;
  else nextStatus = EnumSubscriptionStatus.ACTIVE;

  await Subscription.updateOne(
    { merchant: event.app_user_id },
    {
      $set: {
        merchant: event.app_user_id,
        rcAppUserId: event.app_user_id,
        entitlement: event.entitlement_id || event.entitlement_ids?.[0],
        productId: event.product_id,
        store: event.store,
        status: nextStatus,
        currentPeriodEnd: event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)) : undefined,
        lastEvent: event.type,
      },
    },
    { upsert: true },
  );

  // Persist the transaction for the admin Payments screen (purchases/renewals).
  if (["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE"].includes(event.type)) {
    await PaymentService.recordFromWebhook(event);
  }

  return { received: true, status: nextStatus };
};


const adminGetAll = async (query: QueryParams) => {
  const base: Record<string, unknown> = {};
  if (query.status) base.status = query.status;
  const { meta, result } = await new QueryBuilder(
    Subscription.find(base).populate([{ path: "merchant", select: "name email" }]).lean(),
    query,
  ).execute([]);
  return { meta, result };
};

const SubscriptionService = {
  getPlans,
  getMySubscription,
  hasActiveEntitlement,
  handleWebhook,
  adminGetAll,
};

export { SubscriptionService };
