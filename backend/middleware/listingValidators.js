const { body } = require("express-validator");

const createListingValidators = [
  body("name").notEmpty().withMessage("name is required"),
  body("description").notEmpty().withMessage("description is required"),
  body("address").notEmpty().withMessage("address is required"),
  body("type")
    .optional()
    .equals("rent")
    .withMessage("Only rental listings are supported"),
  body("monthlyRent")
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage("monthlyRent must be a number greater than 0"),
  body("regularPrice")
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage("regularPrice must be a number greater than 0"),
  body().custom((_, { req }) => {
    if (req.body.monthlyRent == null && req.body.regularPrice == null) {
      throw new Error("monthlyRent is required");
    }
    return true;
  }),
  body("bedrooms")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("bedrooms must be an integer greater than or equal to 1"),
  body("totalRooms")
    .isInt({ min: 1 })
    .withMessage("totalRooms must be an integer greater than or equal to 1"),
  body("bathrooms")
    .isInt({ min: 1 })
    .withMessage("bathrooms must be an integer greater than or equal to 1"),
  body("studentAccommodation")
    .optional()
    .isBoolean()
    .withMessage("studentAccommodation must be a boolean"),
];

module.exports = {
  createListingValidators,
};
