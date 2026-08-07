const express = require("express");
// Custom Imports
const authController = require("../controllers/authController");
const walletService = require("../utils/walletService");
const catchAsync = require("../utils/catchAsync");

const router = express.Router();

// PUBLIC ROUTES (No authentication required)
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/google", authController.google); // ← Move this HERE, before protect middleware
router.get("/verify-email", authController.verifyEmail);
router.post("/verify-phone", authController.verifyPhone);
router.post("/resend-phone-otp", authController.resendPhoneOtp);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/resend-verification", authController.protect, authController.resendVerification);
router.get("/check-availability", authController.checkAvailability);
router.get("/me", authController.protect, authController.getMe);
router.get("/:id", authController.optionalAuth, authController.getUserByListingId);

// PROTECTED ROUTES (Authentication required for all routes below this point)
router.use(authController.protect);

router.get("/wallet/balance", catchAsync(async (req, res) => {
  const balance = await walletService.getBalance(req.user.id);
  res.status(200).json({ status: "success", data: { tokenBalance: balance } });
}));

router.get("/wallet/transactions", catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
  const transactions = await walletService.getTransactions(req.user.id, limit);
  res.status(200).json({ status: "success", data: { transactions } });
}));

// USER CONTROLLER
router.post(
  "/submit-verification",
  authController.requireRole("landlord"),
  authController.submitVerification
);
router.put("/update/:id", authController.update);
router.delete("/delete/:id", authController.delete);

module.exports = router;
