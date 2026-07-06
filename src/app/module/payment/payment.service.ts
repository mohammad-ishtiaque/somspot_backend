const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import Payment from "./Payment";

// Called from the RevenueCat webhook to persist a transaction (idempotent by id).
const recordFromWebhook = async (event: Record<string, any>) => {
  const transactionId = event.transaction_id || event.id;
  if (!transactionId || !event.app_user_id) return null;

  await Payment.updateOne(
    { transactionId },
    {
      $set: {
        merchant: event.app_user_id,
        transactionId,
        productId: event.product_id,
        store: event.store,
        eventType: event.type,
        price: event.price ?? event.price_in_purchased_currency ?? 0,
        currency: event.currency || "USD",
        purchasedAt: event.purchased_at_ms ? new Date(Number(event.purchased_at_ms)) : new Date(),
      },
    },
    { upsert: true },
  );
  return { recorded: true, transactionId };
};

const adminGetAll = async (query: QueryParams) => {
  const base: Record<string, unknown> = {};
  if (query.merchant) base.merchant = query.merchant;

  const paymentQuery = new QueryBuilder(
    Payment.find(base).populate([{ path: "merchant", select: "name email" }]).lean(),
    query,
  )
    .search(["transactionId"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([paymentQuery.modelQuery, paymentQuery.countTotal()]);
  return { meta, result };
};

const adminGetOne = async (query: { paymentId?: string }) => {
  validateFields(query, ["paymentId"]);
  const payment = await Payment.findById(query.paymentId)
    .populate([{ path: "merchant", select: "name email" }])
    .lean();
  if (!payment) throw new ApiError(status.NOT_FOUND, "Transaction not found");
  return payment;
};

const PaymentService = { recordFromWebhook, adminGetAll, adminGetOne };

export { PaymentService };
