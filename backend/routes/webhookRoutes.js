const express = require("express");
const webhookController = require("../controllers/webhookController");

const router = express.Router();

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  webhookController.handleStripeWebhook
);

router.post(
  "/payment",
  express.urlencoded({ extended: false }),
  webhookController.handlePaynowWebhook
);

module.exports = router;
