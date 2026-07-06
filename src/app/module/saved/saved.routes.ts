import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { SavedController } from "./saved.controller";

const router = Router();

router
  .post("/toggle", auth(config.auth_level.user), SavedController.toggleSaved)
  .get("/get-all", auth(config.auth_level.user), SavedController.getAllSaved)
  .delete("/remove", auth(config.auth_level.user), SavedController.removeSaved);

export = router;
