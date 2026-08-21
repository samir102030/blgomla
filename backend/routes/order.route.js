import express from "express";
// import {
//   createOrder,
//   getOrders,
//   getOrderById,
//   getUserOrders,
//   updateOrderStatus,
//   markOrderPaid,
//   markOrderDelivered,
//   cancelOrder,
//   deleteOrder,
// } from "../controllers/order.controller.js";
import {
  validateCancelOrder,
  validateCreateOrder,
  validateDeleteOrder,
  validateGetAllOrders,
  validateMarkOrderDelivered,
  validateMarkOrderPaid,
  validateUpdateOrderStatus,
} from "../validations/order.validate.js";
import {
  createOrder,
  deleteOrder,
  getMyOrders,
  getOrderById,
  getOrders,
  getUserOrders,
  markOrderDelivered,
  markOrderPaid,
  updateOrderStatus,
  cancelOrder,
  getInstallationOrders,
  updateInstallation,
} from "../controllers/order.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import { translateResponse } from "../middleware/translation.middleware.js";

const router = express.Router();

// Create a new order
router.post("/", protectRoute, validateCreateOrder, createOrder);

// Get all orders (admin)
//
// Gated on orders.view, which the controller then reads a second way: staff
// who hold it get every order, a vendor gets their own store's, a customer
// gets the ones they placed. Without the gate the controller's staff test
// was `dashboard.view` alone, so an account created to price one section of
// the catalogue was handed every order in the shop — line items, totals, and
// the buyer's name, email and phone.
router.get(
  "/",
  protectRoute,
  requirePermission("orders.view"),
  translateResponse,
  validateGetAllOrders,
  getOrders
);

// Get my orders (authenticated user)
router.get("/my-orders", protectRoute, translateResponse, getMyOrders);

// The fitting queue. Declared before "/:id" — Express matches in order, so
// registering it after would make "installations" be read as an order id.
router.get(
  "/installations",
  protectRoute,
  requirePermission("installations.view"),
  getInstallationOrders
);
router.put(
  "/:id/installation",
  protectRoute,
  requirePermission("installations.manage"),
  updateInstallation
);

// Get a single order by ID
router.get("/:id", protectRoute, translateResponse, getOrderById);

// Get all orders for a user
// router.get("/user/:userId", getUserOrders);

// Update order status (staff only)
router.put("/:id/status", protectRoute, requirePermission("orders.edit"), validateUpdateOrderStatus, updateOrderStatus);

// Mark order as paid (staff only)
router.put("/:id/pay", protectRoute, requirePermission("orders.edit"), validateMarkOrderPaid, markOrderPaid);

// Mark order as delivered (staff only)
router.put("/:id/deliver", protectRoute, requirePermission("orders.edit"), validateMarkOrderDelivered, markOrderDelivered);

// Cancel an order (staff only)
router.put("/:id/cancel", protectRoute, requirePermission("orders.cancel"), validateCancelOrder, cancelOrder);

// Delete an order
router.delete("/:id", protectRoute, validateDeleteOrder, deleteOrder);

export default router;
