import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { SubscriptionService } from "./subscription.service";
import { EnumSubscriptionStatus } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const merchantId = new mongoose.Types.ObjectId().toString();

describe("SubscriptionService.handleWebhook", () => {
  it("marks ACTIVE on INITIAL_PURCHASE and grants entitlement", async () => {
    const r = await SubscriptionService.handleWebhook({
      event: { type: "INITIAL_PURCHASE", app_user_id: merchantId, product_id: "pro", expiration_at_ms: Date.now() + 1e9 },
    });
    expect(r.status).toBe(EnumSubscriptionStatus.ACTIVE);
    expect(await SubscriptionService.hasActiveEntitlement(merchantId)).toBe(true);
  });

  it("marks EXPIRED on EXPIRATION and revokes entitlement", async () => {
    await SubscriptionService.handleWebhook({ event: { type: "INITIAL_PURCHASE", app_user_id: merchantId } });
    await SubscriptionService.handleWebhook({ event: { type: "EXPIRATION", app_user_id: merchantId } });
    expect(await SubscriptionService.hasActiveEntitlement(merchantId)).toBe(false);
  });

  it("rejects an invalid payload", async () => {
    await expect(SubscriptionService.handleWebhook({})).rejects.toThrow();
  });
});
