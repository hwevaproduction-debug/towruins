const express = require("express");
const multer = require("multer");
const { protect, requireRole } = require("../controllers/authController");
const adminOnboardController = require("../controllers/adminOnboardController");

const router = express.Router();

// Configure multer for CSV file uploads
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Admin onboarding routes (protected)
router.post(
  "/import/validate",
  protect,
  requireRole("admin"),
  upload.single("file"),
  adminOnboardController.validateImport
);

router.post(
  "/import",
  protect,
  requireRole("admin"),
  upload.single("file"),
  adminOnboardController.createImport
);

router.get(
  "/invitations",
  protect,
  requireRole("admin"),
  adminOnboardController.getInvitations
);

router.post(
  "/invitations/:invitationId/resend",
  protect,
  requireRole("admin"),
  adminOnboardController.resendInvitation
);

router.post(
  "/invitations/:invitationId/revoke",
  protect,
  requireRole("admin"),
  adminOnboardController.revokeInvitation
);

// Account claim routes (public/unprotected for token validation and claim)
router.get(
  "/claim/validate",
  adminOnboardController.validateClaimToken
);

router.post(
  "/claim",
  adminOnboardController.claimAccount
);

// Onboarding completion (protected - requires login after claim)
router.post(
  "/onboarding/complete",
  protect,
  adminOnboardController.completeOnboarding
);

module.exports = router;
