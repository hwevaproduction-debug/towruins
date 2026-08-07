const { body } = require("express-validator");

const listingFeeValidators = [
  body("listingId")
    .notEmpty()
    .withMessage("listingId is required")
    .isString()
    .withMessage("listingId must be a valid listing ID")
    .bail()
    .custom((value) => value.trim().length > 0)
    .withMessage("listingId must be a valid listing ID"),
  body("earlyAccess")
    .optional()
    .isBoolean()
    .withMessage("earlyAccess must be a boolean"),
];

const tenantPremiumValidators = [];

const bookingPaymentValidators = [
  body("phone")
    .notEmpty()
    .withMessage("phone is required")
    .isString()
    .withMessage("phone must be a string"),
  body("idempotencyKey")
    .optional()
    .isString()
    .withMessage("idempotencyKey must be a string")
    .isLength({ min: 8 })
    .withMessage("idempotencyKey must be at least 8 characters"),
];

const partialPaymentValidators = [
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("amount must be a positive number"),
  body("phone")
    .notEmpty()
    .withMessage("phone is required")
    .isString()
    .withMessage("phone must be a string"),
  body("idempotencyKey")
    .optional()
    .isString()
    .withMessage("idempotencyKey must be a string")
    .isLength({ min: 8 })
    .withMessage("idempotencyKey must be at least 8 characters"),
];

const refundValidators = [
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("amount must be a positive number"),
  body("reason")
    .optional()
    .isString()
    .withMessage("reason must be a string")
    .isLength({ max: 500 })
    .withMessage("reason must be 500 characters or less"),
];

const retryValidators = [
  body("phone")
    .notEmpty()
    .withMessage("phone is required")
    .isString()
    .withMessage("phone must be a string"),
];

module.exports = {
  bookingPaymentValidators,
  listingFeeValidators,
  partialPaymentValidators,
  refundValidators,
  retryValidators,
  tenantPremiumValidators,
};
