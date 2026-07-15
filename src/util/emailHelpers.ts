const { default: status } = require("http-status");

import ApiError from "../error/ApiError";
import otpResendTemp from "../mail/otpResendTemp";
import resetPassEmailTemp from "../mail/resetPassEmailTemp";
import signUpEmailTemp from "../mail/signUpEmailTemp";
import { sendEmail } from "../util/sendEmail";
import { t } from "./i18n";

const sendActivationEmail = async (
  email: string,
  data: {
    user: string;
    activationCode: string;
    activationCodeExpire: number;
  },
  language: string = "en",
) => {
  try {
    await sendEmail({
      email,
      subject: t("Activate Your Account", language),
      html: signUpEmailTemp({
        user: data.user,
        activationCode: data.activationCode,
        activationCodeExpire: data.activationCodeExpire.toString(),
      }),
    });
  } catch (error) {
    console.log(error);
    throw new ApiError(status.INTERNAL_SERVER_ERROR, "Email was not sent");
  }
};

const sendOtpResendEmail = async (
  email: string,
  data: {
    user: string;
    activationCode: string;
    activationCodeExpire: number;
  },
  language: string = "en",
) => {
  try {
    await sendEmail({
      email,
      subject: t("New Activation Code", language),
      html: otpResendTemp({
        user: data.user,
        code: Number(data.activationCode),
        expiresIn: Number(data.activationCodeExpire),
        activationCode: Number(data.activationCode),
        activationCodeExpire: Number(data.activationCodeExpire),
      }),
    });
  } catch (error) {
    console.log(error);
    throw new ApiError(status.INTERNAL_SERVER_ERROR, "Email was not sent");
  }
};

const sendResetPasswordEmail = async (
  email: string,
  data: {
    user: string;
    verificationCode: string;
    verificationCodeExpire: number;
  },
  language: string = "en",
) => {
  try {
    await sendEmail({
      email,
      subject: t("Password Reset Code", language),
      html: resetPassEmailTemp({
        name: data.user,
        verificationCode: Number(data.verificationCode),
        verificationCodeExpire: data.verificationCodeExpire,
      }),
    });
  } catch (error) {
    console.log(error);
    throw new ApiError(status.INTERNAL_SERVER_ERROR, "Email was not sent");
  }
};

const EmailHelpers = {
  sendActivationEmail,
  sendOtpResendEmail,
  sendResetPasswordEmail,
};

export = EmailHelpers;
