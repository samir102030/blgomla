import ReturnRequest from "../models/return.model.js";
import Order from "../models/order.model.js";
import Store from "../models/store.model.js";
import Notification from "../models/notification.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

/**
 * What the customer is told, per state their return lands in.
 *
 * Nineteen notifications go out across this API — orders, addresses, brand
 * requests, product approvals — and returns sent none. So a customer asked for
 * a return and then heard nothing: the request was approved or refused inside
 * the dashboard and the only way to find out was to go looking for it.
 *
 * Written from the customer's side. "Received" is the warehouse's word for it;
 * what the customer needs to know is that their parcel arrived and the refund
 * is next.
 */
const RETURN_MESSAGE = {
  approved: {
    title: "Return approved",
    body: (id) => `Your return for order #${id} was approved. Send the item back and we'll refund you once it arrives.`,
    type: "success",
  },
  rejected: {
    title: "Return declined",
    body: (id) => `Your return for order #${id} was not approved. Open it to see why, or reply and we'll take another look.`,
    type: "warning",
  },
  received: {
    title: "Return received",
    body: (id) => `We've received the item from order #${id}. Your refund is being processed.`,
    type: "info",
  },
  refunded: {
    title: "Refund sent",
    body: (id) => `The refund for order #${id} has been sent.`,
    type: "success",
  },
};

/** Same short form the order notifications use, so the two agree. */
const shortId = (id) => String(id).slice(-8).toUpperCase();

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

    /*
      Tell whoever has to act on it.

      A return sat in the dashboard waiting to be noticed by someone who
      happened to open that page. Every other request in this shop — a brand, a
      category, a product needing approval — puts a notification in front of
      the person who can answer it, and a return is more time-sensitive than
      any of them: the customer is holding something they want to send back.

      Wrapped, because a customer's return must be recorded whether or not the
      seller's notification can be written.
    */
    try {
      const storeDoc = order.store
        ? await Store.findById(order.store).select("owner name")
        : null;
      if (storeDoc?.owner) {
        await Notification.create({
          user: storeDoc.owner,
          title: "Return requested",
          message: `A customer asked to return order #${shortId(order._id)}.${
            reason ? ` Reason: ${String(reason).slice(0, 120)}` : ""
          }`,
          type: "warning",
          link: `/dashboard/returns`,
        });
      }
    } catch (error) {
      console.error("Could not notify the store about the return:", error.message);
    }

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

    /*
      Tell the customer. Never let it break the update.

      The status change is the thing that has to hold; a notification that
      cannot be written is worth logging and no more. Same shape as the order
      status change, which learned this the same way.
    */
    const say = RETURN_MESSAGE[status];
    if (say && returnRequest.user) {
      try {
        await Notification.create({
          user: returnRequest.user,
          title: say.title,
          message: say.body(shortId(returnRequest.order)),
          type: say.type,
          link: `/account?tab=returns`,
        });
      } catch (error) {
        console.error("Could not notify about the return status:", error.message);
      }
    }

    res.status(200).json({ success: true, return: updatedReturn });
  }
);
