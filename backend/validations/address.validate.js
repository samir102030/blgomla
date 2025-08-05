import { body, param, query, validationResult } from "express-validator";
import mongoose from "mongoose";

// Helper function to wrap validations with error handling
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

// Common validations
const validateAddressId = validate([
  param("id")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid address ID format"),
]);

// Address CRUD Validations
export const validateCreateAddress = validate([
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  // make it optional
  body("phone")
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage("Invalid phone number format"),

  // body("phone")
  //   .trim()
  //   .notEmpty()
  //   .withMessage("Phone number is required")
  //   .isMobilePhone()
  //   .withMessage("Invalid phone number format"),

  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ max: 200 })
    .withMessage("Address cannot exceed 200 characters"),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ max: 50 })
    .withMessage("City cannot exceed 50 characters"),

  body("state")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("State cannot exceed 50 characters"),

  body("zipCode")
    .optional()
    .trim()
    .isPostalCode("any")
    .withMessage("Invalid postal code format"),


  body("type")
    .optional()
    .isIn(["Billing", "Shipping"])
    .withMessage("Type must be either Billing or Shipping"),
]);

export const validateUpdateAddress = validate([
  // ...validateAddressId._validations,

  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),

  body("phone")
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage("Invalid phone number format"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address cannot exceed 200 characters"),

  body("city")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("City cannot exceed 50 characters"),

  body("state")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("State cannot exceed 50 characters"),

  body("zipCode")
    .optional()
    .trim()
    .isPostalCode("any")
    .withMessage("Invalid postal code format"),


  body("type")
    .optional()
    .isIn(["Billing", "Shipping"])
    .withMessage("Type must be either Billing or Shipping"),

  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean value"),
]);

// export const validateSetDefaultAddress = validateAddressId;

// export const validateGetAddressById = validateAddressId;

// export const validateDeleteAddress = validateAddressId;

// For admin routes
export const validateGetAllAddresses = validate([
  query("userId")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid user ID format"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
]);
