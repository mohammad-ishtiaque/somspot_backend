import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { OfferController } from "./offer.controller";
import { uploadFile } from "../../middleware/fileUploader";

const router = Router();

router
  .post("/create", auth(config.auth_level.merchant), uploadFile(), OfferController.createOffer)
  .get("/my", auth(config.auth_level.merchant), OfferController.getMyOffers)
  .patch("/update", auth(config.auth_level.merchant), uploadFile(), OfferController.updateOffer)
  .delete("/delete", auth(config.auth_level.merchant), OfferController.deleteOffer)
  .get("/admin/list", auth(config.auth_level.admin), OfferController.adminGetAll)
  .patch("/admin/moderate", auth(config.auth_level.admin), OfferController.adminModerate)
  .get("/get-all", auth([], false), OfferController.getAllOffers)
  .get("/top-deals", auth([], false), OfferController.getTopDeals)
  .get("/get", auth([], false), OfferController.getOffer);

export = router;
