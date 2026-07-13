import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { SearchService } from "./search.service";
import Business from "../business/Business";
import { EnumBusinessStatus } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const user = { userId: new mongoose.Types.ObjectId().toString(), role: "USER" };

describe("SearchService", () => {
  it("returns matching approved businesses and records recent history", async () => {
    await Business.create({ owner: new mongoose.Types.ObjectId(), name: "Pizza Palace", category: new mongoose.Types.ObjectId(), status: EnumBusinessStatus.APPROVED });
    const { result } = await SearchService.search(user as any, { term: "Pizza" });
    expect(result.length).toBe(1);
    const recent = await SearchService.getRecent(user as any);
    expect(recent[0].term).toBe("Pizza");
  });

  it("clears recent searches", async () => {
    await SearchService.search(user as any, { term: "Coffee" });
    await SearchService.clearRecent(user as any);
    expect(await SearchService.getRecent(user as any)).toHaveLength(0);
  });
});
