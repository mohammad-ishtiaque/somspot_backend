import express from "express";
import auth from "../../middleware/auth";
import { uploadFile } from "../../middleware/fileUploader";
import { UserController } from "./user.controller";
import config from "../../../config";

const router = express.Router();

router
  .get("/profile", auth(config.auth_level.user), UserController.getProfile)
  .patch(
    "/edit-profile",
    auth(config.auth_level.user),
    uploadFile(),
    UserController.updateProfile,
  )
  .post("/rate-app", auth(config.auth_level.user), UserController.rateApp)
  .delete(
    "/delete-account",
    auth(config.auth_level.user),
    UserController.deleteMyAccount,
  )
  // ---- admin ----
  .get("/admin/list", auth(config.auth_level.admin), UserController.adminGetAllUsers)
  .get("/admin/details", auth(config.auth_level.admin), UserController.adminGetUser)
  .patch("/admin/block", auth(config.auth_level.admin), UserController.adminToggleBlock);

export = router;
