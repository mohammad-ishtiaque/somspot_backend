import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { MerchantService } from "./merchant.service";
import Business from "../business/Business";
import BusinessView from "../business/BusinessView";
import Offer from "../offer/Offer";
import Claim from "../claim/Claim";
import Campaign from "../campaign/Campaign";
import Notification from "../notification/Notification";
import User from "../user/User";
import Auth from "../auth/Auth";
import { EnumBusinessStatus, EnumOfferStatus, EnumUserRole, EnumCampaignStatus, EnumClaimStatus } from "../../../util/enum";

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

  it("consolidates header, campaign status, activity summary, top deals, and recent claims into one response", async () => {
    const authId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: authId, name: "Abdul Karim", email: "merchant@test.com", password: "Passw0rd!", role: EnumUserRole.MERCHANT, isActive: true });
    await User.create({ _id: merchant.userId, authId, name: "Abdul Karim", email: "merchant@test.com", profile_image: "uploads/profile_image/pic.jpg" });

    const business = await Business.create({
      owner: merchant.userId,
      name: "Hilib Macaan",
      category: new mongoose.Types.ObjectId(),
      status: EnumBusinessStatus.APPROVED,
      address: "Maka Al Mukarama, Mogadishu",
    });
    const offer = await Offer.create({ business: business._id, title: "20% Off Family Platter", discountLabel: "20% OFF", endAt: new Date(Date.now() + 1e7), status: EnumOfferStatus.ACTIVE, createdBy: merchant.userId, totalClaims: 5 });

    const customerAuthId = new mongoose.Types.ObjectId();
    await Auth.create({ _id: customerAuthId, name: "Ahmed M.", email: "ahmed@test.com", password: "Passw0rd!", role: EnumUserRole.USER, isActive: true });
    const customer = await User.create({ authId: customerAuthId, name: "Ahmed M.", email: "ahmed@test.com" });
    await Claim.create({ user: customer._id, offer: offer._id, business: business._id, code: "SOM-1", status: EnumClaimStatus.CLAIMED, expiresAt: new Date(Date.now() + 1e7) });

    await Campaign.create({ merchant: merchant.userId, business: business._id, name: "Campaign A", status: EnumCampaignStatus.PENDING_REVIEW });
    await Campaign.create({ merchant: merchant.userId, business: business._id, name: "Campaign B", status: EnumCampaignStatus.LIVE });

    await Notification.create({ toId: merchant.userId, title: "New claim", message: "You got a claim", isRead: false });
    await Notification.create({ toId: merchant.userId, title: "Old", message: "Already seen", isRead: true });

    // 2 logged-in views from the same customer + 1 guest view -> 2 unique viewers, 3 total views.
    await BusinessView.create({ business: business._id, viewer: customer._id });
    await BusinessView.create({ business: business._id, viewer: customer._id });
    await BusinessView.create({ business: business._id, ip: "203.0.113.5" });

    const dash = await MerchantService.getDashboard(merchant as any);

    expect(dash.merchant.name).toBe("Abdul Karim");
    expect(dash.primaryBusiness).toEqual({ name: "Hilib Macaan", address: "Maka Al Mukarama, Mogadishu" });
    expect(dash.unreadNotifications).toBe(1);
    expect(dash.campaignStatus).toEqual({ inReview: 1, active: 1 });
    expect(dash.totalViews).toBe(3);
    expect(dash.activitySummary).toEqual({ visitors: 3, uniqueUsers: 2, engagementRate: 33, bounceRate: 67 });
    expect(dash.topDeals).toEqual([
      { title: "20% Off Family Platter", discountLabel: "20% OFF", businessName: "Hilib Macaan", totalClaims: 5 },
    ]);
    expect(dash.recentClaims).toHaveLength(1);
    expect(dash.recentClaims[0]).toMatchObject({ offerTitle: "20% Off Family Platter", claimedBy: "Ahmed M." });
  });
});
