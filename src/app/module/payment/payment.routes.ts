import { Router } from "express";
import auth from "../../middleware/auth";
import config from "../../../config";
import { PaymentController } from "./payment.controller";

const router = Router();

router
  .get("/admin/list", auth(config.auth_level.admin), PaymentController.adminGetAll)
  .get("/admin/details", auth(config.auth_level.admin), PaymentController.adminGetOne);

export = router;
