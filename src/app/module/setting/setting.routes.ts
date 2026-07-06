import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { SettingController } from "./setting.controller";

const router = Router();

router
  .get("/languages", SettingController.getLanguages)
  .get("/", auth(config.auth_level.admin), SettingController.getSettings)
  .patch("/", auth(config.auth_level.admin), SettingController.updateSettings);

export = router;
