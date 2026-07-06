import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { OfferController } from "./offer.controller";

const router = Router();

router
  .post("/create", auth(config.auth_level.merchant), OfferController.createOffer)
  .get("/my", auth(config.auth_level.merchant), OfferController.getMyOffers)
  .patch("/update", auth(config.auth_level.merchant), OfferController.updateOffer)
  .delete("/delete", auth(config.auth_level.merchant), OfferController.deleteOffer)
  .get("/get-all", OfferController.getAllOffers)
  .get("/get", OfferController.getOffer);

export = router;
