import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

export const createOrder = controllerWrapper(
  "createOrder",
  async (req, res) => {
    const { orderItems, shippingAddress, paymentMethod, store } = req.body;

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

    try {
      // Step 1: Validate stock availability and calculate prices
      let itemsPrice = 0;
      let shippingPrice = 0;
      let taxPrice = 0;
      let totalPrice = 0;

      const validatedItems = [];

      for (const item of orderItems) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product ${item.product} not found`,
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
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
        });
      }

      totalPrice = itemsPrice + shippingPrice + taxPrice;

      // Step 2: Create the order
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
      });

      const savedOrder = await order.save();

      // Step 3: Update product stock and sold count
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: {
            stock: -item.quantity,
            soldCount: item.quantity,
          },
        });
      }

      // Step 4: Clear user's cart
      await User.findByIdAndUpdate(req.user._id, { $set: { cart: [] } });

      res.status(201).json({
        success: true,
        order: savedOrder,
        message: "Order created successfully",
      });
    } catch (error) {
      console.error("Error creating order:", error);

      // If order was created but subsequent operations failed,
      // we should ideally rollback, but for simplicity we'll log the error
      // In a production system, you'd want proper transaction handling

      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error.message,
      });
    }
  }
);

export const getOrders = controllerWrapper("getOrders", async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("user")
    .populate("orderItems.product")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, orders });
});

export const getOrderById = controllerWrapper(
  "getOrderById",
  async (req, res) => {
    const order = await Order.findById(req.params.id).populate("user");
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
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, message: "Order deleted" });
  }
);
