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
router.use(authController.requireRole("landlord"));

router.post(
  "/",
  ...createListingDraftValidators,
  validate,
  listingDraftController.createListingDraft
);

router.get("/mine", listingDraftController.getMyListingDrafts);
router.get("/:id", listingDraftController.getListingDraft);

router.put(
  "/:id",
  ...updateListingDraftValidators,
  validate,
  listingDraftController.updateListingDraft
);

router.delete("/:id", listingDraftController.deleteListingDraft);

module.exports = router;

