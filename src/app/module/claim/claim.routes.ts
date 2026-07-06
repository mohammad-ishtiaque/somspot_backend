import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { ClaimController } from "./claim.controller";

const router = Router();

router
  .post("/claim-offer", auth(config.auth_level.user), ClaimController.claimOffer)
  .get("/wallet", auth(config.auth_level.user), ClaimController.getWallet)
  .get("/get", auth(config.auth_level.user), ClaimController.getClaim)
  .patch("/redeem", auth(config.auth_level.merchant), ClaimController.redeemClaim);

export = router;
