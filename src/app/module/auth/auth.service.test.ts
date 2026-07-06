import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import bcrypt from "bcrypt";
import { connectTestDb, clearTestDb, closeTestDb } from "../../../test/dbHandler";
import { EnumUserRole } from "../../../util/enum";

vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));

vi.mock("../../../util/emailHelpers", () => {
  const EmailHelpers = {
    sendActivationEmail: vi.fn().mockResolvedValue(undefined),
    sendOtpResendEmail: vi.fn().mockResolvedValue(undefined),
    sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
  };
  return { default: EmailHelpers, ...EmailHelpers };
});

vi.mock("../../../util/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  errorLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// vi.mock calls above are hoisted above these imports by Vitest, so
// auth.service picks up the mocked node-cron/emailHelpers/logger.
import { AuthService } from "./auth.service";
import Auth from "./Auth";

beforeAll(async () => {
  await connectTestDb();
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

const baseUser = {
  role: EnumUserRole.USER,
  name: "Jane Doe",
  email: "jane@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
};

describe("AuthService.registrationAccount", () => {
  it("creates an inactive Auth + User record and does not store the plaintext password on the Auth doc directly", async () => {
    const result = await AuthService.registrationAccount(baseUser);

    expect(result.isActive).toBe(false);

    const authDoc = await Auth.findOne({ email: baseUser.email }).select(
      "+password",
    );
    expect(authDoc).not.toBeNull();
    expect(authDoc!.password).not.toBe(baseUser.password);
    expect(await bcrypt.compare(baseUser.password, authDoc!.password)).toBe(
      true,
    );
  });

  it("rejects a role that isn't in EnumUserRole", async () => {
    await expect(
      AuthService.registrationAccount({ ...baseUser, role: "SUPER_HACKER" }),
    ).rejects.toThrow(/Invalid role/);
  });

  it("rejects mismatched password/confirmPassword", async () => {
    await expect(
      AuthService.registrationAccount({
        ...baseUser,
        confirmPassword: "something-else",
      }),
    ).rejects.toThrow(/didn't match/);
  });

  it("re-registering an inactive account issues a new activation code instead of erroring", async () => {
    await AuthService.registrationAccount(baseUser);
    const first = await Auth.findOne({ email: baseUser.email });

    const result = await AuthService.registrationAccount(baseUser);
    const second = await Auth.findOne({ email: baseUser.email });

    expect(result.isActive).toBe(false);
    expect(second!.activationCode).not.toBe(first!.activationCode);
  });
});

describe("AuthService.activateAccount", () => {
  it("activates the account and returns a token pair when the code matches", async () => {
    await AuthService.registrationAccount(baseUser);
    const authDoc = await Auth.findOne({ email: baseUser.email });

    const result = await AuthService.activateAccount({
      email: baseUser.email,
      activationCode: authDoc!.activationCode!,
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();

    const updated = await Auth.findOne({ email: baseUser.email });
    expect(updated!.isActive).toBe(true);
  });

  it("rejects a wrong activation code", async () => {
    await AuthService.registrationAccount(baseUser);

    await expect(
      AuthService.activateAccount({
        email: baseUser.email,
        activationCode: "000000",
      }),
    ).rejects.toThrow(/didn't match/);
  });

  it("rejects activation for an email that was never registered", async () => {
    await expect(
      AuthService.activateAccount({
        email: "nobody@example.com",
        activationCode: "123456",
      }),
    ).rejects.toThrow(/not found/i);
  });
});

async function registerAndActivate(user = baseUser) {
  await AuthService.registrationAccount(user);
  const authDoc = await Auth.findOne({ email: user.email });
  await AuthService.activateAccount({
    email: user.email,
    activationCode: authDoc!.activationCode!,
  });
}

describe("AuthService.loginAccount", () => {
  it("logs in with correct credentials once activated", async () => {
    await registerAndActivate();

    const result = await AuthService.loginAccount({
      email: baseUser.email,
      password: baseUser.password,
    });

    expect(result.accessToken).toBeTruthy();
  });

  it("rejects an incorrect password", async () => {
    await registerAndActivate();

    await expect(
      AuthService.loginAccount({
        email: baseUser.email,
        password: "wrong-password",
      }),
    ).rejects.toThrow(/incorrect/);
  });

  it("rejects login before activation", async () => {
    await AuthService.registrationAccount(baseUser);

    await expect(
      AuthService.loginAccount({
        email: baseUser.email,
        password: baseUser.password,
      }),
    ).rejects.toThrow(/activate/);
  });

  it("rejects login for a blocked account", async () => {
    await registerAndActivate();
    await Auth.updateOne({ email: baseUser.email }, { isBlocked: true });

    await expect(
      AuthService.loginAccount({
        email: baseUser.email,
        password: baseUser.password,
      }),
    ).rejects.toThrow(/blocked/);
  });
});

describe("AuthService.changePassword", () => {
  it("hashes the new password (regression test: this used to store it as plaintext)", async () => {
    await registerAndActivate();
    const authDoc = await Auth.findOne({ email: baseUser.email });
    const userData = {
      authId: String(authDoc!._id),
      userId: String(authDoc!._id),
      email: baseUser.email,
      role: baseUser.role as "USER",
    };

    await AuthService.changePassword(userData, {
      oldPassword: baseUser.password,
      newPassword: "NewPassword456!",
      confirmPassword: "NewPassword456!",
    });

    const updated = await Auth.findOne({ email: baseUser.email }).select(
      "+password",
    );
    expect(updated!.password).not.toBe("NewPassword456!");
    expect(await bcrypt.compare("NewPassword456!", updated!.password)).toBe(
      true,
    );

    // and the user really can log in with the new password afterwards
    const login = await AuthService.loginAccount({
      email: baseUser.email,
      password: "NewPassword456!",
    });
    expect(login.accessToken).toBeTruthy();
  });

  it("rejects when oldPassword is wrong", async () => {
    await registerAndActivate();
    const authDoc = await Auth.findOne({ email: baseUser.email });
    const userData = {
      authId: String(authDoc!._id),
      userId: String(authDoc!._id),
      email: baseUser.email,
      role: baseUser.role as "USER",
    };

    await expect(
      AuthService.changePassword(userData, {
        oldPassword: "totally-wrong",
        newPassword: "NewPassword456!",
        confirmPassword: "NewPassword456!",
      }),
    ).rejects.toThrow(/incorrect/);
  });
});

describe("AuthService.forgotPass + forgetPassOtpVerify + resetPassword", () => {
  it("full forgot-password flow ends with a working new password", async () => {
    await registerAndActivate();

    await AuthService.forgotPass({ email: baseUser.email });
    const withCode = await Auth.findOne({ email: baseUser.email });
    expect(withCode!.verificationCode).toBeTruthy();

    await AuthService.forgetPassOtpVerify({
      email: baseUser.email,
      code: withCode!.verificationCode!,
    });
    const verified = await Auth.findOne({ email: baseUser.email });
    expect(verified!.isVerified).toBe(true);

    await AuthService.resetPassword({
      email: baseUser.email,
      newPassword: "ResetPassword789!",
      confirmPassword: "ResetPassword789!",
    });

    const login = await AuthService.loginAccount({
      email: baseUser.email,
      password: "ResetPassword789!",
    });
    expect(login.accessToken).toBeTruthy();
  });

  it("resetPassword rejects if the account never completed OTP verification", async () => {
    await registerAndActivate();

    await expect(
      AuthService.resetPassword({
        email: baseUser.email,
        newPassword: "ResetPassword789!",
        confirmPassword: "ResetPassword789!",
      }),
    ).rejects.toThrow(/verification/i);
  });

  it("forgetPassOtpVerify rejects an invalid code", async () => {
    await registerAndActivate();
    await AuthService.forgotPass({ email: baseUser.email });

    await expect(
      AuthService.forgetPassOtpVerify({
        email: baseUser.email,
        code: "999999",
      }),
    ).rejects.toThrow(/Invalid verification code/);
  });
});

describe("AuthService.resendActivationCode", () => {
  it("issues a new activation code for an existing account", async () => {
    await AuthService.registrationAccount(baseUser);
    const before = await Auth.findOne({ email: baseUser.email });

    await AuthService.resendActivationCode({ email: baseUser.email });

    const after = await Auth.findOne({ email: baseUser.email });
    expect(after!.activationCode).not.toBe(before!.activationCode);
  });

  it("rejects an email that was never registered", async () => {
    await expect(
      AuthService.resendActivationCode({ email: "ghost@example.com" }),
    ).rejects.toThrow(/not found/i);
  });
});
