import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";

vi.mock("../../../util/postNotification", () => ({ default: vi.fn() }));

import { FeedbackService } from "./feedback.service";
import User from "../user/User";
import Auth from "../auth/Auth";
import { EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const makeUser = async () => {
  const auth = await Auth.create({ name: "Ali", email: "ali@x.co", password: "Passw0rd!", role: EnumUserRole.USER, isActive: true });
  const u = await User.create({ authId: auth._id, name: "Ali", email: "ali@x.co" });
  return { userId: String(u._id), role: EnumUserRole.USER };
};

describe("FeedbackService (support tickets)", () => {
  it("requires a subject", async () => {
    const user = await makeUser();
    await expect(FeedbackService.postFeedback(user as any, { feedback: "help" } as any)).rejects.toThrow();
  });

  it("creates a support ticket with subject and open status", async () => {
    const user = await makeUser();
    const t = await FeedbackService.postFeedback(user as any, { subject: "Login issue", feedback: "Cannot log in" });
    expect(t.subject).toBe("Login issue");
    expect(t.status).toBe("open");
  });

  it("marks the ticket replied when the admin replies", async () => {
    const user = await makeUser();
    const t = await FeedbackService.postFeedback(user as any, { subject: "Q", feedback: "..." });
    const replied = await FeedbackService.updateFeedbackWithReply(user as any, { feedbackId: String(t._id), reply: "Resolved" } as any);
    expect(replied!.status).toBe("replied");
  });
});
