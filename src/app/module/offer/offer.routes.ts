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
  .get("/get-all", OfferController.getAllOffers)
  .get("/get", OfferController.getOffer);

export = router;
