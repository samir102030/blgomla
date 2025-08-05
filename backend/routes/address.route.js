import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  validateCreateAddress,
  validateGetAllAddresses,
  validateUpdateAddress,
} from "../validations/address.validate.js";
import {
  createAddress,
  deleteAddress,
  getAddressById,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../controllers/address.controller.js";

const router = express.Router();

// Create a new address
router.post("/", protectRoute, validateCreateAddress, createAddress);

// Get all addresses (admin)
router.get("/", protectRoute, validateGetAllAddresses, getAddresses);

// Get a single address by ID
router.get("/:id", protectRoute, getAddressById);

// // Get all addresses for a user
// router.get("/user/:userId", getUserAddresses);

// Update an address
router.put("/:id", protectRoute, validateUpdateAddress, updateAddress);

// Delete an address
router.delete("/:id", deleteAddress);

// Set default address for user
router.put("/:id/default", setDefaultAddress);

export default router;
