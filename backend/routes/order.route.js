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
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Create a new order
router.post("/", protectRoute, validateCreateOrder, createOrder);

// Get all orders (admin)
router.get("/", protectRoute, validateGetAllOrders, getOrders);

// Get my orders (authenticated user)
router.get("/my-orders", protectRoute, getMyOrders);

// Get a single order by ID
router.get("/:id", protectRoute, getOrderById);

// Get all orders for a user
// router.get("/user/:userId", getUserOrders);

// Update order status
router.put("/:id/status", validateUpdateOrderStatus, updateOrderStatus);

// Mark order as paid
router.put("/:id/pay", validateMarkOrderPaid, markOrderPaid);

// Mark order as delivered
router.put("/:id/deliver", validateMarkOrderDelivered, markOrderDelivered);

// Cancel an order
router.put("/:id/cancel", validateCancelOrder, cancelOrder);

// Delete an order
router.delete("/:id", protectRoute, validateDeleteOrder, deleteOrder);

export default router;
