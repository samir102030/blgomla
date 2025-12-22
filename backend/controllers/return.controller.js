import ReturnRequest from "../models/return.model.js";
import Order from "../models/order.model.js";
import Store from "../models/store.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

export const createReturnRequest = controllerWrapper(
  "createReturnRequest",
  async (req, res) => {
    const { orderId, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to return this order",
      });
    }

    if (!order.isDelivered && order.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned",
      });
    }

    const existingReturn = await ReturnRequest.findOne({ order: order._id });
    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: "A return request already exists for this order",
      });
    }

    const returnRequest = await ReturnRequest.create({
      order: order._id,
      user: req.user._id,
      store: order.store,
      reason,
    });

    res.status(201).json({ success: true, return: returnRequest });
  }
);

export const getMyReturns = controllerWrapper("getMyReturns", async (req, res) => {
  const returns = await ReturnRequest.find({ user: req.user._id })
    .populate("order", "status totalPrice createdAt orderItems")
    .populate("store", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, returns });
});

export const getReturns = controllerWrapper("getReturns", async (req, res) => {
  let query = {};

  if (req.user.role === "store") {
    const stores = await Store.find({ owner: req.user._id }).select("_id");
    const storeIds = stores.map((store) => store._id);

    if (storeIds.length === 0) {
      return res.status(200).json({ success: true, returns: [] });
    }

    query = { store: { $in: storeIds } };
  }

  const returns = await ReturnRequest.find(query)
    .populate("order", "status totalPrice createdAt orderItems")
    .populate("user", "name email")
    .populate("store", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, returns });
});

export const updateReturnStatus = controllerWrapper(
  "updateReturnStatus",
  async (req, res) => {
    const { status, adminNote } = req.body;
    const returnRequest = await ReturnRequest.findById(req.params.id);

    if (!returnRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Return request not found" });
    }

    if (req.user.role === "store") {
      const stores = await Store.find({ owner: req.user._id }).select("_id");
      const storeIds = stores.map((store) => String(store._id));

      if (!storeIds.includes(String(returnRequest.store))) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to manage this return",
        });
      }
    }

    const update = { status };
    if (adminNote) update.adminNote = adminNote;

    const updatedReturn = await ReturnRequest.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    )
      .populate("order", "status totalPrice createdAt orderItems")
      .populate("user", "name email")
      .populate("store", "name");

    res.status(200).json({ success: true, return: updatedReturn });
  }
);
