import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { SavedService } from "./saved.service";
import Business from "../business/Business";
import { EnumBusinessStatus } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const user = { userId: new mongoose.Types.ObjectId().toString(), role: "USER" };

const makeBusiness = () =>
  Business.create({
    owner: new mongoose.Types.ObjectId(),
    name: "Liido Cafe",
    category: new mongoose.Types.ObjectId(),
    status: EnumBusinessStatus.APPROVED,
  });

describe("SavedService", () => {
  it("toggles save on and off", async () => {
    const b = await makeBusiness();
    const a = await SavedService.toggleSaved(user as any, { businessId: String(b._id) });
    expect(a.saved).toBe(true);
    const c = await SavedService.toggleSaved(user as any, { businessId: String(b._id) });
    expect(c.saved).toBe(false);
  });

  it("lists saved businesses", async () => {
    const b = await makeBusiness();
    await SavedService.toggleSaved(user as any, { businessId: String(b._id) });
    const { result } = await SavedService.getAllSaved(user as any, {});
    expect(result).toHaveLength(1);
  });
});
