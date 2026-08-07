const express = require("express");
const auth = require("../controllers/authController");
const ctrl = require("../controllers/promotionController");

const router = express.Router();

router.use(auth.protect);

router.get("/", auth.requireRole("admin"), ctrl.listPromotions);
router.post("/", ctrl.createPromotion);
router.put("/:id", ctrl.updatePromotion);
router.delete("/:id", ctrl.deactivatePromotion);
router.get("/:id/coupons", ctrl.listCoupons);
router.post("/:id/coupons", ctrl.generateCoupons);

module.exports = router;
