import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Store from "../models/store.model.js";
import mongoose from "mongoose";
import { controllerWrapper } from "../utils/wrappers.js";
import Notification from "../models/notification.model.js";
import Coupon from "../models/coupon.model.js";

export const createOrder = controllerWrapper(
  "createOrder",
  async (req, res) => {
    const { orderItems, shippingAddress, paymentMethod, store, couponCode } =
      req.body;

    // Validate required fields
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    if (!store) {
      return res.status(400).json({
        success: false,
        message: "Store is required",
      });
    }

    // Only allow Cash On Delivery
    if (paymentMethod.toLowerCase() !== "cod") {
      return res.status(400).json({
        success: false,
        message: "Only Cash On Delivery payment method is accepted",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Validate stock availability and calculate prices
      let itemsPrice = 0;
      let shippingPrice = 0;
      let taxPrice = 0;
      let totalPrice = 0;
      let couponDiscount = 0;

      const validatedItems = [];

      for (const item of orderItems) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: `Product ${item.product} not found`,
          });
        }

        if (product.stock < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}. Please remove this item from your cart or reduce the quantity.`,
          });
        }

        // Calculate price (considering sale if active)
        const itemPrice = product.saleActive
          ? product.price * (1 - product.salePercentage / 100)
          : product.price;

        itemsPrice += itemPrice * item.quantity;

        validatedItems.push({
          product: item.product,
          quantity: item.quantity,
          price: itemPrice,
          salePercentage: product.saleActive ? product.salePercentage : 0,
          couponDiscount: 0, // Will be updated after coupon validation
        });
      }

      // Step 2: Validate and apply coupon if provided
      let appliedCoupon = null;
      if (couponCode) {
        const coupon = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          store: store,
          isActive: true,
        }).session(session);

        if (!coupon) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Invalid coupon code",
          });
        }

        // Check if coupon is valid
        if (!coupon.isValid) {
          await session.abortTransaction();
          let message = "Coupon is not valid";
          const now = new Date();
          if (now < coupon.startDate) message = "Coupon has not started yet";
          else if (now > coupon.endDate) message = "Coupon has expired";
          else if (
            coupon.usageLimit &&
            coupon.usageCount >= coupon.usageLimit
          ) {
            message = "Coupon usage limit exceeded";
          }
          return res.status(400).json({ success: false, message });
        }

        // Check minimum purchase
        if (itemsPrice < coupon.minimumPurchase) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Minimum purchase of $${coupon.minimumPurchase} required for this coupon`,
          });
        }

        // Check if coupon applies to any items
        let applicableSubtotal = 0;
        for (let i = 0; i < validatedItems.length; i++) {
          const item = validatedItems[i];
          const product = await Product.findById(item.product).session(session);
          if (coupon.canApplyToProduct(product._id, product.Category)) {
            applicableSubtotal += item.price * item.quantity;
          }
        }

        if (applicableSubtotal === 0) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Coupon does not apply to any items in your cart",
          });
        }

        // Calculate discount
        couponDiscount = coupon.calculateDiscount(applicableSubtotal);
        appliedCoupon = coupon;

        // Distribute discount proportionally to applicable items
        let remainingDiscount = couponDiscount;
        for (let i = 0; i < validatedItems.length; i++) {
          const item = validatedItems[i];
          const product = await Product.findById(item.product).session(session);
          if (coupon.canApplyToProduct(product._id, product.Category)) {
            const itemTotal = item.price * item.quantity;
            const proportion = itemTotal / applicableSubtotal;
            const itemDiscount = Math.min(
              remainingDiscount * proportion,
              itemTotal
            );
            validatedItems[i].couponDiscount = itemDiscount;
            remainingDiscount -= itemDiscount;
          }
        }
      }

      // Calculate final prices
      const discountPrice = couponDiscount; // Total discount applied
      totalPrice = itemsPrice + shippingPrice + taxPrice - discountPrice;

      // Step 3: Create the order
      const order = new Order({
        user: req.user._id,
        orderItems: validatedItems,
        shippingAddress,
        paymentMethod,
        store,
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount,
        discountPrice,
      });

      const savedOrder = await order.save({ session });

      // Step 4: Update coupon usage count if coupon was applied
      if (appliedCoupon) {
        await Coupon.findByIdAndUpdate(
          appliedCoupon._id,
          { $inc: { usageCount: 1 } },
          { session }
        );
      }

      // Step 5: Update product stock and sold count
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stock: -item.quantity,
              soldCount: item.quantity,
            },
          },
          { session }
        );
      }

      // Step 6: Clear user's cart
      await User.findByIdAndUpdate(
        req.user._id,
        { $set: { cart: [] } },
        { session }
      );

      // Commit the transaction
      await session.commitTransaction();

      // Create notifications
      try {
        await Notification.create({
          user: savedOrder.user,
          title: "Order Placed",
          message: `Your order #${savedOrder._id} has been placed successfully.`,
          type: "success",
        });

        // Notify store owner(s) about new order
        const storeDoc = await Store.findById(savedOrder.store).populate(
          "owner"
        );
        if (storeDoc && storeDoc.owner) {
          const customer = await User.findById(savedOrder.user);
          await Notification.create({
            user: storeDoc.owner._id,
            title: "New Order Received",
            message: `You have received a new order #${savedOrder._id} from ${
              customer?.name || "A customer"
            }.`,
            type: "success",
          });
        }
      } catch (error) {
        console.error("Error creating order notifications:", error);
      }

      res.status(201).json({
        success: true,
        order: savedOrder,
        message: "Order created successfully",
      });
    } catch (error) {
      // Abort transaction on any error
      await session.abortTransaction();
      console.error("Error creating order:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  }
);

export const getOrders = controllerWrapper("getOrders", async (req, res) => {
  let query = {};
  let populateOptions = ["user", "orderItems.product", "shippingAddress"];

  // Handle different user roles
  if (req.user.role === "admin") {
    // Admin gets all orders
    query = {};
  } else if (req.user.role === "store") {
    // Store/vendor gets orders that contain products from their store(s)
    const vendorStores = await Store.find({ owner: req.user._id }).select(
      "_id"
    );
    const storeIds = vendorStores.map((store) => store._id);

    if (storeIds.length === 0) {
      // Vendor has no stores, return empty array
      return res.status(200).json({ success: true, orders: [] });
    }

    // Find orders where the store field matches one of the vendor's stores
    // OR where any order item product belongs to one of the vendor's stores
    query = {
      $or: [
        { store: { $in: storeIds } },
        {
          "orderItems.product": {
            $in: await Product.find({ store: { $in: storeIds } }).distinct(
              "_id"
            ),
          },
        },
      ],
    };
  } else {
    // Regular customers get only their own orders
    query = { user: req.user._id };
  }

  const orders = await Order.find(query)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, orders });
});

export const getOrderById = controllerWrapper(
  "getOrderById",
  async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate("user")
      .populate("shippingAddress")
      .populate("orderItems.product");
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  }
);

export const getUserOrders = controllerWrapper(
  "getUserOrders",
  async (req, res) => {
    const orders = await Order.find({ user: req.params.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, orders });
  }
);

export const getMyOrders = controllerWrapper(
  "getMyOrders",
  async (req, res) => {
    const orders = await Order.find({ user: req.user._id })
      .populate("shippingAddress")
      .populate("orderItems.product")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  }
);

export const updateOrderStatus = controllerWrapper(
  "updateOrderStatus",
  async (req, res) => {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Create notification for customer about status change
    const statusMessages = {
      confirmed: "confirmed",
      processing: "is being processed",
      shipped: "has been shipped",
      delivered: "has been delivered",
      cancelled: "has been cancelled",
    };

    const message = statusMessages[status] || "status has been updated";

    try {
      await Notification.create({
        user: order.user,
        title: "Order Status Update",
        message: `Your order #${order._id} ${message}.`,
        type: status === "cancelled" ? "warning" : "info",
      });
    } catch (error) {
      console.error("Error creating order status notification:", error);
    }

    res.status(200).json({ success: true, order });
  }
);

export const markOrderPaid = controllerWrapper(
  "markOrderPaid",
  async (req, res) => {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        isPaid: true,
        paidAt: new Date(),
        paymentResult: req.body.paymentResult,
      },
      { new: true }
    );
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  }
);

export const markOrderDelivered = controllerWrapper(
  "markOrderDelivered",
  async (req, res) => {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { isDelivered: true, deliveredAt: new Date(), status: "delivered" },
      { new: true }
    );
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  }
);

export const cancelOrder = controllerWrapper(
  "cancelOrder",
  async (req, res) => {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled", cancelled: true },
      { new: true }
    );
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  }
);

export const deleteOrder = controllerWrapper(
  "deleteOrder",
  async (req, res) => {
    // Find the order first to check permissions
    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Check permissions based on user role
    if (req.user.role === "admin") {
      // Admin can delete any order
    } else if (req.user.role === "store") {
      // Store/vendor can only delete orders that contain products from their stores
      const vendorStores = await Store.find({ owner: req.user._id }).select(
        "_id"
      );
      const storeIds = vendorStores.map((store) => store._id);

      if (storeIds.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to delete this order",
        });
      }

      // Check if the order belongs to one of the vendor's stores
      const hasPermission =
        storeIds.includes(order.store) ||
        (await Product.find({
          _id: { $in: order.orderItems.map((item) => item.product) },
          store: { $in: storeIds },
        }).countDocuments()) > 0;

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to delete this order",
        });
      }
    } else {
      // Regular customers cannot delete orders (they can only cancel them)
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete orders",
      });
    }

    // Check if order can be deleted (only pending or cancelled orders)
    if (!["pending", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Only pending or cancelled orders can be deleted",
      });
    }

    // Delete the order
    await Order.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .json({ success: true, message: "Order deleted successfully" });
  }
);
