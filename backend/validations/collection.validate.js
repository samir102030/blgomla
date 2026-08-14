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

/**
 * Fields shared by create and update. A line price is nullable on purpose —
 * null means "follow the product's price", which is different from 0, a line
 * deliberately quoted as free.
 */
const collectionExtras = [
  body("items.*.unitPrice")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Item price must be zero or more"),
  body("brands").optional().isArray().withMessage("Brands must be a list"),
  body("brands.*")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid brand ID format"),
  body("installation.offered")
    .optional()
    .isBoolean()
    .withMessage("Installation toggle must be true or false"),
  body("installation.price")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Installation price must be zero or more"),
];

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
  ...collectionExtras,
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
  ...collectionExtras,
]);

export const validateCollectionIdParam = validateCollectionId;
