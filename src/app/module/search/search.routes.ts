import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { SearchController } from "./search.controller";

const router = Router();

router
  .get("/", auth(config.auth_level.user), SearchController.search)
  .get("/recent", auth(config.auth_level.user), SearchController.getRecent)
  .delete("/recent/clear", auth(config.auth_level.user), SearchController.clearRecent)
  .get("/trending", SearchController.getTrendingSearches);

export = router;
