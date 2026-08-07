const { body } = require("express-validator");

const dataValidator = body("data")
  .optional()
  .custom((value) => {
    if (value == null) return true;
    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error("data must be an object");
    }
    return true;
  });

const createListingDraftValidators = [dataValidator];
const updateListingDraftValidators = [dataValidator];

module.exports = {
  createListingDraftValidators,
  updateListingDraftValidators,
};

