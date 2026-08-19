import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { PackageController } from "./package.controller";

const router = Router();

router
  .get("/admin/list", PackageController.getAllPackages)
  .get("/get-all", PackageController.getAllPackages)
  .post("/create", auth(config.auth_level.admin), PackageController.createPackage)
  .patch("/update", auth(config.auth_level.admin), PackageController.updatePackage)
  .delete("/delete", auth(config.auth_level.admin), PackageController.deletePackage);

export = router;
