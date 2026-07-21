import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { CreatorService } from "./creator.service";
import { CampaignService } from "../campaign/campaign.service";
import Campaign from "../campaign/Campaign";
import Auth from "../auth/Auth";
import Earning from "./Earning";
import { EnumCampaignStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const creator = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.CREATOR };

const makeLiveCampaign = () =>
  Campaign.create({
    merchant: new mongoose.Types.ObjectId(),
    business: new mongoose.Types.ObjectId(),
    name: "BOGO Pizza",
    status: EnumCampaignStatus.LIVE,
    pricePerClaim: 5,
  });

describe("CreatorService", () => {
  it("lists tasks an admin assigned to the creator", async () => {
    await Auth.create({ _id: creator.userId, name: "Creator", email: "creator@somspot.so", password: "Passw0rd!", role: EnumUserRole.CREATOR });
    const c = await makeLiveCampaign();
    await CampaignService.assignCreator({ campaignId: String(c._id), creatorUserId: creator.userId } as any);
    const { result } = await CreatorService.getMyTasks(creator as any, {});
    expect(result).toHaveLength(1);
  });

  it("aggregates the wallet balance from earnings", async () => {
    await Earning.create({ creator: creator.userId, campaign: new mongoose.Types.ObjectId(), application: new mongoose.Types.ObjectId(), amount: 10, status: "available" });
    await Earning.create({ creator: creator.userId, campaign: new mongoose.Types.ObjectId(), application: new mongoose.Types.ObjectId(), amount: 5, status: "paid" });
    const w = await CreatorService.getWallet(creator as any);
    expect(w.totalEarnings).toBe(15);
    expect(w.availableBalance).toBe(10);
    expect(w.paidOut).toBe(5);
  });

  it("rejects a payout above the available balance", async () => {
    await Earning.create({ creator: creator.userId, campaign: new mongoose.Types.ObjectId(), application: new mongoose.Types.ObjectId(), amount: 10, status: "available" });
    await expect(CreatorService.requestPayout(creator as any, { amount: 50 })).rejects.toThrow();
    const p = await CreatorService.requestPayout(creator as any, { amount: 8 });
    expect(p.amount).toBe(8);
  });
});
