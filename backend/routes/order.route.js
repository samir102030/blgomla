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
} from "../controllers/order.controller.js";
import { protectRoute, requirePermission } from "../middleware/auth.middleware.js";
import { translateResponse } from "../middleware/translation.middleware.js";

const router = express.Router();

// Create a new order
router.post("/", protectRoute, validateCreateOrder, createOrder);

// Get all orders (admin)
router.get(
  "/",
  protectRoute,
  translateResponse,
  validateGetAllOrders,
  getOrders
);

// Get my orders (authenticated user)
router.get("/my-orders", protectRoute, translateResponse, getMyOrders);

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
