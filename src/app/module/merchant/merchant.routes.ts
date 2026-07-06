import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { MerchantController } from "./merchant.controller";

const router = Router();

router
  .get("/dashboard", auth(config.auth_level.merchant), MerchantController.getDashboard)
  .get("/analytics", auth(config.auth_level.merchant), MerchantController.getAnalytics)
  .get("/onboarding-status", auth(config.auth_level.merchant), MerchantController.getOnboardingStatus);

export = router;
