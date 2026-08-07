const express = require("express");
const authController = require("../controllers/authController");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

router.use(authController.protect);

router.post("/", reviewController.createReview);
router.get("/mine", reviewController.getMyReviews);
router.get(
  "/provider",
  authController.requireRole("provider"),
  reviewController.getProviderReviews
);
router.get(
  "/analytics",
  authController.requireRole("admin"),
  reviewController.getReviewAnalytics
);
router.get(
  "/",
  authController.requireRole("admin"),
  reviewController.getAllReviews
);
router.post(
  "/:id/response",
  authController.requireRole("provider"),
  reviewController.respondToReview
);
router.patch(
  "/:id/response",
  authController.requireRole("provider"),
  reviewController.respondToReview
);
router.put(
  "/:id/response",
  authController.requireRole("provider"),
  reviewController.respondToReview
);
router.patch(
  "/:id/moderate",
  authController.requireRole("admin"),
  reviewController.moderateReview
);
router.put(
  "/:id/moderate",
  authController.requireRole("admin"),
  reviewController.moderateReview
);
router.get("/:id", reviewController.getReviewById);
router.patch("/:id", reviewController.updateReview);
router.put("/:id", reviewController.updateReview);
router.delete("/:id", reviewController.deleteReview);

module.exports = router;
