const express = require("express");
const authController = require("../controllers/authController");
const listingDraftController = require("../controllers/listingDraftController");
const validate = require("../middleware/validate");
const {
  createListingDraftValidators,
  updateListingDraftValidators,
} = require("../middleware/listingDraftValidators");

const router = express.Router();

router.use(authController.protect);

router.post(
  "/",
  ...createListingDraftValidators,
  validate,
  authController.requireRole("landlord"),
  listingDraftController.createListingDraft
);

router.get(
  "/mine",
  authController.requireRole(["landlord", "provider"]),
  listingDraftController.getMyListingDrafts
);
router.get(
  "/:id",
  authController.requireRole("landlord"),
  listingDraftController.getListingDraft
);

router.put(
  "/:id",
  ...updateListingDraftValidators,
  validate,
  authController.requireRole("landlord"),
  listingDraftController.updateListingDraft
);

router.delete(
  "/:id",
  authController.requireRole("landlord"),
  listingDraftController.deleteListingDraft
);

module.exports = router;

