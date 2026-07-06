import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { CategoryController } from "./category.controller";

const router = Router();

router
  .post("/create", auth(config.auth_level.admin), CategoryController.createCategory)
  .get("/get-all", CategoryController.getAllCategories)
  .get("/get", CategoryController.getCategory)
  .patch("/update", auth(config.auth_level.admin), CategoryController.updateCategory)
  .delete("/delete", auth(config.auth_level.admin), CategoryController.deleteCategory);

export = router;
