const express = require("express");
const authController = require("../controllers/authController");
const bookingController = require("../controllers/bookingController");
const validate = require("../middleware/validate");
const { paymentLimiter } = require("../middleware/rateLimiter");
const {
  bookingPaymentValidators,
  partialPaymentValidators,
  refundValidators,
} = require("../middleware/paymentValidators");

const router = express.Router();

router.use(authController.protect);

router.post("/", bookingController.createBooking);
router.get("/mine", bookingController.getMyBookings);
router.post(
  "/initiate-payment",
  paymentLimiter,
  ...bookingPaymentValidators,
  validate,
  bookingController.initiateBookingPayment
);
router.post("/:id/cancel", bookingController.cancelBooking);
router.put("/:id/cancel", bookingController.cancelBooking);
router.get("/:id/cancellation-preview", bookingController.getCancellationPreview);
router.post(
  "/:id/partial-payment",
  paymentLimiter,
  ...partialPaymentValidators,
  validate,
  bookingController.initiatePartialPayment
);
router.post(
  "/:id/refund",
  paymentLimiter,
  ...refundValidators,
  validate,
  bookingController.initiateRefund
);
router.get("/provider", bookingController.getProviderBookings);
router.put("/:id/modify", bookingController.modifyBooking);
router.post("/:id/guest-info", bookingController.submitGuestInfo);
router.get(
  "/",
  authController.requireRole("admin"),
  bookingController.getAdminBookings
);
router.get(
  "/admin",
  authController.requireRole("admin"),
  bookingController.getAdminBookings
);
router.post("/:id/confirm", bookingController.confirmBooking);
router.post("/:id/decline", bookingController.declineBooking);
router.post("/:id/check-in", bookingController.checkInBooking);
router.put(
  "/:id/settle",
  authController.requireRole("admin"),
  bookingController.settleBooking
);
router.post(
  "/:id/settle",
  authController.requireRole("admin"),
  bookingController.settleBooking
);
router.get("/:id", bookingController.getBookingById);

module.exports = router;
