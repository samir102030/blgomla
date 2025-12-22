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

const validateReturnId = validate([
  param("id")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid return ID format"),
]);

export const validateCreateReturn = validate([
  body("orderId")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid order ID format"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Reason cannot exceed 1000 characters"),
]);

export const validateUpdateReturnStatus = validate([
  param("id")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid return ID format"),
  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "approved", "rejected", "received", "refunded"])
    .withMessage("Invalid return status"),
  body("adminNote")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Admin note cannot exceed 1000 characters"),
]);

export const validateGetReturnById = validateReturnId;
