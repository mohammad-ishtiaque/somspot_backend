const { default: status } = require("http-status");
import { AuthService } from "./auth.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import getAuthUser from "../../../util/getAuthUser";
import config from "../../../config";
import { Request, Response } from "express";
import ApiError from "../../../error/ApiError";
import { getProfileCompletion } from "./profileCompletion";
import User from "../user/User";
import auth from "../../middleware/auth";
import Auth from "./Auth";

const registrationAccount = catchAsync(async (req: Request, res: Response) => {
  const { message, ...data } = await AuthService.registrationAccount(req.body);

  const isSuccess =
    message === "Account created successfully. Please check your email";

  sendResponse(res, {
    statusCode: isSuccess ? 200 : 400,
    success: isSuccess,
    message: message || "Something went wrong",
    data,
  });
});

const resendActivationCode = catchAsync(async (req: Request, res: Response) => {
  await AuthService.resendActivationCode(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Resent successfully",
  });
});

// This call has no valid JWT yet, so the `auth` middleware never ran to apply
// the account's saved language preference. Apply it here now that the
// account is known, unless the request explicitly asked for a language.
const applyAccountLanguage = (res: Response, language?: string) => {
  if (res.locals.languageIsDefault && language) {
    res.locals.language = language;
  }
};

const activateAccount = catchAsync(async (req: Request, res: Response) => {
  const { language, ...result } = await AuthService.activateAccount(req.body);
  applyAccountLanguage(res, language);
  const { refreshToken } = result;

  const cookieOptions = {
    secure: config.env === "production",
    httpOnly: true,
  };
  res.cookie("refreshToken", refreshToken, cookieOptions);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Activation code verified successfully.",
    data: result,
  });
});

const loginAccount = catchAsync(async (req: Request, res: Response) => {
  const { language, ...result } = await AuthService.loginAccount(req.body);
  applyAccountLanguage(res, language);
  const { refreshToken } = result;

  const cookieOptions = {
    secure: config.env === "production",
    httpOnly: true,
  };
  res.cookie("refreshToken", refreshToken, cookieOptions);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Log in successful",
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  }
  await AuthService.changePassword(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password changed successfully!",
  });
});

const forgotPass = catchAsync(async (req: Request, res: Response) => {
  await AuthService.forgotPass(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Check your email!",
  });
});

const forgetPassOtpVerify = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgetPassOtpVerify(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Code verified successfully",
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password has been reset successfully.",
    data: result,
  });
});


const requestPhoneOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.requestPhoneOtp(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Verification code sent",
    data: result,
  });
});

const verifyPhoneOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyPhoneOtp(req.body);
  const cookieOptions = {
    secure: config.env === "production",
    httpOnly: true,
  };
  res.cookie("refreshToken", result.refreshToken, cookieOptions);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Phone verified successfully",
    data: result,
  });
});


const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  // console.log(user)
  const authUserAc = await Auth.findById(user.authId)
  // console.log(authUserAc)
  const completion = await getProfileCompletion(user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Current user",
    data: {
      authId: user.authId,
      userId: user.userId,
      email: user.email,
      role: user.role,
      isActive: authUserAc.isActive,
      ...completion,
    },
  });
});

const AuthController = {
  registrationAccount,
  activateAccount,
  loginAccount,
  changePassword,
  forgotPass,
  resetPassword,
  forgetPassOtpVerify,
  resendActivationCode,
  requestPhoneOtp,
  verifyPhoneOtp,
  getMe,
};

export { AuthController };
