import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { SubscriptionController } from "./subscription.controller";

const router = Router();

router
  .get("/plans", SubscriptionController.getPlans)
  .get("/me", auth(config.auth_level.merchant), SubscriptionController.getMySubscription)
  .get("/admin/list", auth(config.auth_level.admin), SubscriptionController.adminGetAll)
  .post("/webhook", SubscriptionController.webhook);

export = router;
