import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { MerchantController } from "./merchant.controller";

const router = Router();

router
  .get("/dashboard", auth(config.auth_level.merchant), MerchantController.getDashboard)
  .get("/analytics", auth(config.auth_level.merchant), MerchantController.getAnalytics)
  .get("/onboarding-status", auth(config.auth_level.merchant), MerchantController.getOnboardingStatus)
  // ---- admin ----
  .get("/admin/list", auth(config.auth_level.admin), MerchantController.adminGetMerchants)
  .get("/admin/details", auth(config.auth_level.admin), MerchantController.adminGetMerchant)
  .patch("/admin/block", auth(config.auth_level.admin), MerchantController.adminToggleBlockMerchant);

export = router;
