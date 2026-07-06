import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { BusinessController } from "./business.controller";

const router = Router();

router
  // merchant
  .post("/create", auth(config.auth_level.merchant), BusinessController.createBusiness)
  .get("/my", auth(config.auth_level.merchant), BusinessController.getMyBusinesses)
  .patch("/update", auth(config.auth_level.merchant), BusinessController.updateBusiness)
  .delete("/delete", auth(config.auth_level.merchant), BusinessController.deleteBusiness)
  // admin
  .patch("/verify", auth(config.auth_level.admin), BusinessController.verifyBusiness)
  // public / consumer (auth optional so owners can preview unapproved)
  .get("/get-all", BusinessController.getAllBusinesses)
  .get("/trending", BusinessController.getTrending)
  .get("/get", auth(config.auth_level.user, false), BusinessController.getBusiness);

export = router;
