import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { CampaignController } from "./campaign.controller";

const router = Router();

router
  .post("/create", auth(config.auth_level.merchant), CampaignController.createCampaign)
  .get("/my", auth(config.auth_level.merchant), CampaignController.getMyCampaigns)
  .get("/get", auth(config.auth_level.merchant), CampaignController.getCampaign)
  .patch("/update", auth(config.auth_level.merchant), CampaignController.updateCampaign)
  .delete("/delete", auth(config.auth_level.merchant), CampaignController.deleteCampaign)
  .get("/applications", auth(config.auth_level.merchant), CampaignController.getApplications)
  .patch("/review-draft", auth(config.auth_level.merchant), CampaignController.reviewDraft)
  .patch("/verify-publication", auth(config.auth_level.merchant), CampaignController.verifyPublication)
  // ---- admin ----
  .get("/admin/list", auth(config.auth_level.admin), CampaignController.adminGetAll)
  .patch("/admin/review", auth(config.auth_level.admin), CampaignController.reviewCampaign)
  .post("/admin/assign-creator", auth(config.auth_level.admin), CampaignController.assignCreator);

export = router;
