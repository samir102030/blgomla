import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

const calculateOrderPrice = async (orderItems) => {
  let itemsPrice = 0;
  let shippingPrice = 0;
  let taxPrice = 0;
  let totalPrice = 0;
  let discount = 0;
  // Assuming you have a function to get product details by ID
  for (const item of orderItems) {
    // const product = await getProductDetails(item.product);
    const product = await Product.findById(item.product);
    if (product) {
      itemsPrice += product.price * item.quantity;
      // Assuming a flat shipping rate for simplicity
      // shippingPrice += product.shippingPrice || 0;
      // taxPrice += (product.taxRate || 0) * item.quantity;
    }
  }
  totalPrice = itemsPrice + shippingPrice + taxPrice - discount;
  return { itemsPrice, shippingPrice, taxPrice, totalPrice };
};

export const createOrder = controllerWrapper(
  "createOrder",
  async (req, res) => {
    // calculate the itemsPrice, shippingPrice, taxPrice, and totalPrice
    // you should make database query to know the price of the item because it is not included
    // in the request body
    const { itemsPrice, shippingPrice, taxPrice, totalPrice } =
      await calculateOrderPrice(req.body.orderItems);
    // create a new order
    req.body.itemsPrice = itemsPrice;
    req.body.shippingPrice = shippingPrice;
    req.body.taxPrice = taxPrice;
    req.body.totalPrice = totalPrice;

    // const itemsPrice = req.body.orderItems.reduce(
    //   (acc, item) => acc + item.quantity * item.price,
    //   0
    // );
    const order = new Order({
      ...req.body,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      user: req.user._id,
    });
    await order.save();
    res.status(201).json({ success: true, order });
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
