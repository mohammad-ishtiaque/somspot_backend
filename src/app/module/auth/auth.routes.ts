import express from "express";
import auth from "../../middleware/auth";
import { AuthController } from "../auth/auth.controller";
import config from "../../../config";
import limiter from "../../middleware/limiter";

const router = express.Router();

router
  .post("/register", AuthController.registrationAccount)
  .post("/login", limiter, AuthController.loginAccount)
  .get("/me", auth(config.auth_level.user), AuthController.getMe)
  .post("/phone/request-otp", limiter, AuthController.requestPhoneOtp)
  .post("/phone/verify-otp", limiter, AuthController.verifyPhoneOtp)
  .post("/activate-account", AuthController.activateAccount)
  .post("/activation-code-resend", AuthController.resendActivationCode)
  .post("/forgot-password", AuthController.forgotPass)
  .post("/forget-pass-otp-verify", AuthController.forgetPassOtpVerify)
  .post("/reset-password", AuthController.resetPassword)
  .patch(
    "/change-password",
    auth(config.auth_level.user),
    AuthController.changePassword,
  );

export = router;
