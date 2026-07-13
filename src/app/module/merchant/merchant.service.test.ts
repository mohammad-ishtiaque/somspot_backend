import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { MerchantService } from "./merchant.service";
import Business from "../business/Business";
import Offer from "../offer/Offer";
import { EnumBusinessStatus, EnumOfferStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const merchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT };

describe("MerchantService.getDashboard", () => {
  it("reports business and active-offer counts for the merchant", async () => {
    const b = await Business.create({ owner: merchant.userId, name: "Shop", category: new mongoose.Types.ObjectId(), status: EnumBusinessStatus.APPROVED });
    await Offer.create({ business: b._id, title: "Deal", endAt: new Date(Date.now() + 1e7), status: EnumOfferStatus.ACTIVE, createdBy: merchant.userId });

    const dash = await MerchantService.getDashboard(merchant as any);
    expect(dash.businessCount).toBe(1);
    expect(dash.approved).toBe(1);
    expect(dash.activeOffers).toBe(1);
  });
});
