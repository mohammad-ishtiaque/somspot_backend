import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { CreatorController } from "./creator.controller";

const router = Router();

router
  // profile
  .get("/profile", auth(config.auth_level.creator), CreatorController.getMyProfile)
  .patch("/profile", auth(config.auth_level.creator), CreatorController.updateProfile)
  .post("/link-social", auth(config.auth_level.creator), CreatorController.linkSocial)
  // marketplace + applications
  .get("/campaigns", auth(config.auth_level.creator), CreatorController.getMarketplace)
  .post("/apply", auth(config.auth_level.creator), CreatorController.applyToCampaign)
  // tasks
  .get("/tasks", auth(config.auth_level.creator), CreatorController.getMyTasks)
  .get("/task", auth(config.auth_level.creator), CreatorController.getTask)
  .patch("/submit-draft", auth(config.auth_level.creator), CreatorController.submitDraft)
  .patch("/submit-post", auth(config.auth_level.creator), CreatorController.submitPostUrl)
  // earnings
  .get("/wallet", auth(config.auth_level.creator), CreatorController.getWallet)
  .post("/payout/request", auth(config.auth_level.creator), CreatorController.requestPayout)
  .get("/payout/list", auth(config.auth_level.creator), CreatorController.getPayouts)
  .patch("/payout/process", auth(config.auth_level.admin), CreatorController.processPayout);

export = router;
