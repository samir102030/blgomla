import { body, param, query, validationResult } from "express-validator";
import mongoose from "mongoose";
import { PAYMENT_METHODS, isPaymentMethod } from "../config/paymentMethods.js";

// Helper function to wrap validations with error handling
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // The first failure, in the field the client already reads.
    //
    // This answered with `errors` alone. The checkout page looks for
    // `message`, found none, and printed "Invalid order data provided" — so a
    // customer rejected for their payment method was told nothing about the
    // payment method. The array stays for anything that wants the detail.
    const first = errors.array()[0];
    res.status(400).json({
      success: false,
      message: first?.msg || "Invalid order data provided",
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
  body().custom((value) => {
    const orderItems = value.orderItems || [];
    const collectionItems = value.collectionItems || [];
    if (
      (!Array.isArray(orderItems) || orderItems.length === 0) &&
      (!Array.isArray(collectionItems) || collectionItems.length === 0)
    ) {
      throw new Error("Order items or collection items are required");
    }
    return true;
  }),

  body("orderItems")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one order item is required"),

  body("orderItems.*.product")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid product ID format"),

  body("orderItems.*.quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),

  body("collectionItems")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one collection item is required"),

  body("collectionItems.*.collection")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid collection ID format"),

  body("collectionItems.*.quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),

  body("shippingAddress")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid shipping address ID format"),

  // Accepts everything the code can take, not the one method that needed no
  // gateway on the day this was written. Whether a gateway's keys are present
  // is a separate question, answered where the customer is handed over — and
  // answered by name, rather than as a 400 from here with nothing in it.
  body("paymentMethod")
    .trim()
    .notEmpty()
    .withMessage("Payment method is required")
    .custom(isPaymentMethod)
    .withMessage(
      `Unknown payment method. Accepted: ${PAYMENT_METHODS.join(", ")}`
    ),

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
