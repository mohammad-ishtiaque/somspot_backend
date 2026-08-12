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

  it("excludes scheduled (future startAt) offers from the consumer feed", async () => {
    const b = await makeBusiness();
    await OfferService.createOffer(merchant as any, {
      business: String(b._id),
      title: "Not yet",
      startAt: future,
      endAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    });
    const { result } = await OfferService.getAllOffers({});
    expect(result).toHaveLength(0);
  });

  it("derives active/scheduled/expired status and counts for the merchant list", async () => {
    const b = await makeBusiness();
    await OfferService.createOffer(merchant as any, { business: String(b._id), title: "Live", endAt: future });
    await OfferService.createOffer(merchant as any, {
      business: String(b._id),
      title: "Upcoming",
      startAt: future,
      endAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    });
    await OfferService.createOffer(merchant as any, { business: String(b._id), title: "Old", endAt: new Date(Date.now() - 1000).toISOString() });

    const { counts, result } = await OfferService.getMyOffers(merchant as any, {});
    expect(counts).toEqual({ active: 1, scheduled: 1, expired: 1, inactive: 0 });

    const scheduledOnly = await OfferService.getMyOffers(merchant as any, { status: "scheduled" } as any);
    expect(scheduledOnly.result).toHaveLength(1);
    expect(scheduledOnly.result[0].title).toBe("Upcoming");

    expect(result).toHaveLength(3);
  });

  it("returns isClaimed true and claimCode when offer is claimed by the user", async () => {
    const b = await makeBusiness();
    const offer = await OfferService.createOffer(merchant as any, { business: String(b._id), title: "Claimable", endAt: future });

    const user = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.USER };

    // Before claim
    const unclaimed = await OfferService.getOffer({ offerId: String(offer._id) }, user as any);
    expect(unclaimed.isClaimed).toBe(false);
    expect(unclaimed.claimCode).toBeNull();

    // Claim offer
    const { ClaimService } = await import("../claim/claim.service");
    const claim = await ClaimService.claimOffer(user as any, { offerId: String(offer._id) });

    // After claim
    const claimed = await OfferService.getOffer({ offerId: String(offer._id) }, user as any);
    expect(claimed.isClaimed).toBe(true);
    expect(claimed.claimCode).toBe(claim.code);
    expect(claimed.claimStatus).toBe("claimed");
    expect(claimed.claimId).toBe(String(claim._id));
  });
});
