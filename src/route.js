import express from "express";
import controller from "./controller.js";

const router = new express.Router();

router.get("/investments/", controller.investmentList);
router.post("/investments/", controller.investmentCreate);
router.post("/investments/:id", controller.investmentSell);

router.get("/assets/", controller.assetList);

export default router;
