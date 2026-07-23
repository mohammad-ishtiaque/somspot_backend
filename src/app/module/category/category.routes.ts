import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { CategoryController } from "./category.controller";
import { uploadFile } from "../../middleware/fileUploader";

const router = Router();

router
  .post("/create", auth(config.auth_level.admin), uploadFile(), CategoryController.createCategory)
  .get("/get-all", CategoryController.getAllCategories)
  .get("/get", CategoryController.getCategory)
  .patch("/update", auth(config.auth_level.admin), uploadFile(), CategoryController.updateCategory)
  .delete("/delete", auth(config.auth_level.admin), CategoryController.deleteCategory);

export = router;
