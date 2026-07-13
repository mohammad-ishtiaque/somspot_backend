import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { UserService } from "./user.service";
import Auth from "../auth/Auth";
import User from "./User";
import { EnumUserRole } from "../../../util/enum";

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(closeTestDb);

const makeUser = async () => {
  const auth = await Auth.create({ name: "Ali", email: "ali@x.co", password: "Passw0rd!", role: EnumUserRole.USER, isActive: true });
  return User.create({ authId: auth._id, name: "Ali", email: "ali@x.co" });
};

describe("UserService admin", () => {
  it("lists users filtered by role", async () => {
    await makeUser();
    const { result } = await UserService.adminGetAllUsers({ role: EnumUserRole.USER });
    expect(result).toHaveLength(1);
  });

  it("blocks a user by flipping the Auth flag", async () => {
    const u = await makeUser();
    await UserService.adminToggleBlock({ userId: String(u._id), isBlocked: true });
    const auth = await Auth.findOne({ email: "ali@x.co" });
    expect(auth!.isBlocked).toBe(true);
  });
});
