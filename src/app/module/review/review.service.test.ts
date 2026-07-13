import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { ReviewService } from "./review.service";
import Business from "../business/Business";
import { EnumBusinessStatus, EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const user = { userId: new mongoose.Types.ObjectId().toString(), role: EnumUserRole.USER };

const makeBusiness = () =>
  Business.create({ owner: new mongoose.Types.ObjectId(), name: "Resto", category: new mongoose.Types.ObjectId(), status: EnumBusinessStatus.APPROVED });

describe("ReviewService", () => {
  it("posts a review and recomputes the business rating", async () => {
    const b = await makeBusiness();
    await ReviewService.postReview(user as any, { business: String(b._id), rating: 4, review: "Nice" });
    const fresh = await Business.findById(b._id);
    expect(fresh!.ratingAvg).toBe(4);
    expect(fresh!.ratingCount).toBe(1);
  });

  it("prevents a duplicate review by the same user", async () => {
    const b = await makeBusiness();
    await ReviewService.postReview(user as any, { business: String(b._id), rating: 5, review: "A" });
    await expect(ReviewService.postReview(user as any, { business: String(b._id), rating: 3, review: "B" })).rejects.toThrow();
  });

  it("hides a review via moderation so it drops from public listing", async () => {
    const b = await makeBusiness();
    const r = await ReviewService.postReview(user as any, { business: String(b._id), rating: 5, review: "A" });
    await ReviewService.adminModerate({ reviewId: String(r._id), action: "hide" });
    const { result } = await ReviewService.getBusinessReviews({ businessId: String(b._id) });
    expect(result).toHaveLength(0);
  });
});
