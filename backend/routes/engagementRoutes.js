const express = require("express");
const authController = require("../controllers/authController");
const engagementController = require("../controllers/engagementController");
const router = express.Router();

router.use(authController.protect);

router.post("/", engagementController.createEngagement);
router.get("/mine", engagementController.getMyEngagements);
router.get("/incoming", engagementController.getIncomingEngagements);
router.patch("/:id", engagementController.respondToEngagement);

module.exports = router;
