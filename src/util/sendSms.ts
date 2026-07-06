import config from "../config";
import { logger } from "./logger";

/**
 * Stubbed SMS sender for phone-OTP delivery.
 *
 * In non-production it only logs the message so OTP flows are fully testable
 * locally. Swap the body for a real provider (Twilio, etc.) later — the call
 * sites in the auth service do not need to change.
 */
const sendSms = async (to: string, message: string): Promise<void> => {
  if (config.env === "production") {
    // TODO: integrate real SMS provider here.
    logger.warn(`[SMS] provider not configured; skipped SMS to ${to}`);
    return;
  }
  logger.info(`[SMS:DEV] to=${to} | ${message}`);
};

export = sendSms;
