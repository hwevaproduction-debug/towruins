const express = require("express");
const authController = require("../controllers/authController");
const disputeController = require("../controllers/disputeController");

const router = express.Router();

router.use(authController.protect);

router.post("/", disputeController.raiseDispute);

module.exports = router;
