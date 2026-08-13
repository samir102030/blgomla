import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";

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

const validateCollectionId = validate([
  param("id")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid collection ID format"),
]);

export const validateCreateCollection = validate([
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("items")
    .isArray({ min: 2 })
    .withMessage("At least two products are required"),
  body("items.*.product")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid product ID format"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("bundlePrice")
    .isFloat({ min: 0 })
    .withMessage("Bundle price must be a positive number"),
  // Only sent by operators, who have no store of their own. Vendors are
  // pinned to their own store server-side and this is ignored for them.
  body("store")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid store ID format"),
]);

export const validateUpdateCollection = validate([
  param("id")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid collection ID format"),
  body("items")
    .optional()
    .isArray({ min: 2 })
    .withMessage("At least two products are required"),
  body("items.*.product")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid product ID format"),
  body("items.*.quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("bundlePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Bundle price must be a positive number"),
]);

export const validateCollectionIdParam = validateCollectionId;
