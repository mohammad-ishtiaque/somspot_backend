import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { PaymentService } from "./payment.service";
import Payment from "./Payment";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const merchantId = new mongoose.Types.ObjectId().toString();

describe("PaymentService", () => {
  it("records a transaction from a webhook event (idempotent)", async () => {
    const ev = { transaction_id: "txn_1", app_user_id: merchantId, product_id: "pro", price: 9.99, currency: "USD", type: "INITIAL_PURCHASE" };
    await PaymentService.recordFromWebhook(ev);
    await PaymentService.recordFromWebhook(ev); // duplicate → upsert, no new doc
    expect(await Payment.countDocuments({})).toBe(1);
  });

  it("lists transactions for admin", async () => {
    await PaymentService.recordFromWebhook({ transaction_id: "t2", app_user_id: merchantId, price: 5 });
    const { result } = await PaymentService.adminGetAll({});
    expect(result.length).toBe(1);
  });
});
