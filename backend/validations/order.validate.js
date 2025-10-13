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
const validateOrderId = validate([
  param("id")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid order ID format"),
]);

const validateUserId = validate([
  param("userId")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid user ID format"),
]);

// Order CRUD Validations
export const validateCreateOrder = validate([
  body("orderItems")
    .isArray({ min: 1 })
    .withMessage("At least one order item is required"),

  body("orderItems.*.product")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid product ID format"),

  body("orderItems.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),

  body("shippingAddress")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid shipping address ID format"),

  body("paymentMethod")
    .trim()
    .notEmpty()
    .withMessage("Payment method is required")
    .custom((value) => {
      const methods = [
        "Credit Card",
        "PayPal",
        "Bank Transfer",
        "Cash on Delivery",
        "cod",
      ];
      return methods.some((m) => m.toLowerCase() === value.toLowerCase());
    })
    .withMessage("Invalid payment method"),

  // body("itemsPrice")
  //   .isFloat({ min: 0 })
  //   .withMessage("Items price must be a positive number"),

  body("shippingPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Shipping price must be a positive number"),

  body("taxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tax price must be a positive number"),

  body("totalPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Total price must be a positive number"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes cannot exceed 500 characters"),
]);

export const validateUpdateOrderStatus = validate([
  // ...validateOrderId._validations,

  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),
]);

export const validateMarkOrderPaid = validate([
  // ...validateOrderId._validations,

  body("paymentResult.id").optional().trim(),

  body("paymentResult.status").optional().trim(),

  body("paymentResult.update_time").optional().trim(),

  body("paymentResult.email_address")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format"),
]);

export const validateMarkOrderDelivered = validateOrderId;
export const validateCancelOrder = validateOrderId;
export const validateDeleteOrder = validateOrderId;

// For admin routes
export const validateGetAllOrders = validate([
  query("userId")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid user ID format"),

  query("status")
    .optional()
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid order status"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format (use YYYY-MM-DD)"),

  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format (use YYYY-MM-DD)"),
]);

// export const validateGetUserOrders = validateUserId;
// export const validateGetOrderById = validateOrderId;
