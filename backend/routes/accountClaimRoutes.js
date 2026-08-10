const express = require("express");
const { protect } = require("../controllers/authController");
const adminOnboardController = require("../controllers/adminOnboardController");

const router = express.Router();

// Public routes (no authentication required for token validation)
router.get("/claim/validate", adminOnboardController.validateClaimToken);
router.post("/claim", adminOnboardController.claimAccount);

// Protected routes (require authentication)
router.post(
  "/onboarding/complete",
  protect,
  adminOnboardController.completeOnboarding
);

module.exports = router;
