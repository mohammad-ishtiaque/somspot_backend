import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { OfferService } from "./offer.service";
import Business from "../business/Business";
import { EnumBusinessStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const merchant = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.MERCHANT };
const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

const makeBusiness = () =>
  Business.create({ owner: merchant.userId, name: "Shop", category: new mongoose.Types.ObjectId(), status: EnumBusinessStatus.APPROVED });

describe("OfferService", () => {
  it("creates an offer for the owner's business", async () => {
    const b = await makeBusiness();
    const o = await OfferService.createOffer(merchant as any, { business: String(b._id), title: "20% Off", endAt: future });
    expect(o.title).toBe("20% Off");
  });

  it("blocks creating an offer for someone else's business", async () => {
    const b = await Business.create({ owner: new mongoose.Types.ObjectId(), name: "NotMine", category: new mongoose.Types.ObjectId() });
    await expect(OfferService.createOffer(merchant as any, { business: String(b._id), title: "x", endAt: future })).rejects.toThrow();
  });

  it("only lists active, non-expired offers", async () => {
    const b = await makeBusiness();
    await OfferService.createOffer(merchant as any, { business: String(b._id), title: "Live", endAt: future });
    await OfferService.createOffer(merchant as any, { business: String(b._id), title: "Old", endAt: new Date(Date.now() - 1000).toISOString() });
    const { result } = await OfferService.getAllOffers({});
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Live");
  });
});
