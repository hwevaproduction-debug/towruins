const express = require("express");
const { protect, requireRole } = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const adminOnboardController = require("../controllers/adminOnboardController");
const multer = require("multer");

const router = express.Router();

// Configure multer for CSV uploads
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

// Protect all admin routes
router.use(protect);
router.use(requireRole("admin"));

// Existing admin routes (from adminController)
router.get("/listings", adminController.getAdminListings);
router.get("/listings/inactive", adminController.getInactiveListings);
router.post("/listings/bulk-revive", adminController.bulkReviveListings);
router.delete("/listings/:id", adminController.deleteListing);
router.delete("/listings/by-owner/:ownerId", adminController.deleteListingsByOwner);
router.post("/listings/purge-seeded", adminController.purgeSeededListings);

router.get("/accommodations", adminController.getAccommodations);
router.post("/accommodations/:id/approve", adminController.approveAccommodation);
router.post("/accommodations/:id/reject", adminController.rejectAccommodation);
router.post("/accommodations/:id/suspend", adminController.suspendAccommodation);
router.post("/accommodations/:id/reinstate", adminController.reinstateAccommodation);

router.get("/moderation-queue", adminController.getModerationQueue);

router.get("/providers", adminController.getProviders);
router.post("/providers/:id/suspend", adminController.suspendProvider);
router.post("/providers/:id/reinstate", adminController.reinstateProvider);

router.get("/audit-logs", adminController.getAuditLogs);

router.get("/disputes", adminController.getDisputes);
router.post("/disputes/:id/mark-under-review", adminController.markDisputeUnderReview);
router.post("/disputes/:id/resolve", adminController.resolveDispute);
router.post("/disputes/:id/close", adminController.closeDispute);

router.get("/reports", adminController.getReports);
router.post("/reports/:id/resolve", adminController.resolveReport);
router.post("/reports/:id/dismiss", adminController.dismissReport);

// Admin onboarding routes (bulk import, invitations, etc.)
router.post(
  "/onboarding/import/validate",
  upload.single("file"),
  adminOnboardController.validateImport
);

router.post(
  "/onboarding/import",
  upload.single("file"),
  adminOnboardController.createImport
);

router.get(
  "/invitations",
  adminOnboardController.getInvitations
);

router.post(
  "/invitations/:invitationId/resend",
  adminOnboardController.resendInvitation
);

router.post(
  "/invitations/:invitationId/revoke",
  adminOnboardController.revokeInvitation
);

module.exports = router;
