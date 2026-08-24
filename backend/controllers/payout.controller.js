import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Store from "../models/store.model.js";
import StorePayout from "../models/storePayout.model.js";
import ReturnRequest from "../models/return.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

const isAdmin = (user) =>
  user?.role === "admin" || user?.role === "super_admin";

// Resolve the (start, end) Date pair from req.query, returning Date objects
// already widened to cover the whole day for `to`. Returns nulls on bad input.
const parseRange = (q) => {
  const from = q.from ? new Date(q.from) : null;
  let to = q.to ? new Date(q.to) : null;
  if (from && Number.isNaN(from.getTime())) return [null, null];
  if (to && Number.isNaN(to.getTime())) return [null, null];
  if (to) {
    // Treat YYYY-MM-DD `to` as end-of-day inclusive.
    to.setHours(23, 59, 59, 999);
  }
  return [from, to];
};

// Aggregate delivered, paid orders for a store within a range. Excludes
// orders that are already attached to a prior StorePayout (status pending
// or paid) so we never double-count.
const aggregatePayable = async (storeId, periodStart, periodEnd) => {
  // Orders already locked into any non-cancelled payout for this store.
  const lockedDocs = await StorePayout.find({
    store: storeId,
    status: { $in: ["pending", "paid"] },
  })
    .select("orderIds")
    .lean();
  const locked = new Set();
  for (const p of lockedDocs) for (const id of p.orderIds) locked.add(String(id));

  const filter = {
    store: new mongoose.Types.ObjectId(storeId),
    isDelivered: true,
    isPaid: true,
    status: "delivered",
    cancelled: { $ne: true },
  };
  if (periodStart || periodEnd) {
    filter.deliveredAt = {};
    if (periodStart) filter.deliveredAt.$gte = periodStart;
    if (periodEnd) filter.deliveredAt.$lte = periodEnd;
  }

  const orders = await Order.find(filter)
    .select("_id itemsPrice shippingPrice totalPrice deliveredAt couponDiscount pointsRedeemed")
    .lean();

  const notLocked = orders.filter((o) => !locked.has(String(o._id)));

  /*
    An order that came back and was refunded is not a sale.

    This counted every delivered, paid order — and a return does not touch any
    of those three fields, so a customer who sent the goods back and got their
    money returned still produced a full payout for the seller and a full
    commission for the shop. Nothing anywhere subtracted it again.

    Refunded is the only return state that means the money went back. A return
    that is merely requested, approved, or received has not been settled yet
    and its order stays payable until it is — otherwise a customer could park a
    seller's earnings by opening a request.
  */
  const refunded = new Set(
    (
      await ReturnRequest.find({
        order: { $in: notLocked.map((o) => o._id) },
        status: "refunded",
      })
        .select("order")
        .lean()
    ).map((r) => String(r.order))
  );

  const eligible = notLocked.filter((o) => !refunded.has(String(o._id)));

  const grossSales = eligible.reduce((s, o) => s + (o.itemsPrice || 0), 0);
  const shippingTotal = eligible.reduce((s, o) => s + (o.shippingPrice || 0), 0);

  /*
    What the customer did not pay, reported but not deducted.

    `itemsPrice` is the goods total *before* the coupon and before any loyalty
    points — those come off `totalPrice`. So a 20% coupon means the customer
    pays 80 and this pays the seller on 100, with the shop's commission also
    charged on 100. Whether the shop absorbs its own promotions is a decision
    about how this business runs, not a bug to be quietly reversed in a payout
    calculation, so the figures are surfaced and the formula is left alone.
  */
  const discountsAbsorbed = eligible.reduce((s, o) => s + (o.couponDiscount || 0), 0);
  const pointsRedeemed = eligible.reduce((s, o) => s + (o.pointsRedeemed || 0), 0);

  return {
    orderIds: eligible.map((o) => o._id),
    ordersCount: eligible.length,
    grossSales,
    shippingTotal,
    refundedExcluded: notLocked.length - eligible.length,
    discountsAbsorbed,
    pointsRedeemed,
  };
};

// ── ADMIN: preview ──────────────────────────────────────────────────────────
// GET /api/payouts/preview?store=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export const previewPayout = controllerWrapper(
  "previewPayout",
  async (req, res) => {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const { store: storeId } = req.query;
    if (!storeId) {
      return res
        .status(400)
        .json({ success: false, message: "store query param required" });
    }
    const store = await Store.findById(storeId).select("storeName commission payoutDetails");
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }
    const [periodStart, periodEnd] = parseRange(req.query);
    const agg = await aggregatePayable(storeId, periodStart, periodEnd);

    const commissionRate = Number(store.commission || 0);
    const platformFee = Math.round((agg.grossSales * commissionRate) / 100 * 100) / 100;
    const netPayable = Math.round((agg.grossSales - platformFee) * 100) / 100;

    res.status(200).json({
      success: true,
      preview: {
        storeId: store._id,
        storeName: store.storeName,
        periodStart,
        periodEnd,
        ...agg,
        commissionRate,
        platformFee,
        netPayable,
        payoutDetails: store.payoutDetails || null,
      },
    });
  }
);

// ── ADMIN: list eligible stores (any store with at least one payable order)
// GET /api/payouts/eligible-stores?from=...&to=...
export const listEligibleStores = controllerWrapper(
  "listEligibleStores",
  async (req, res) => {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const [periodStart, periodEnd] = parseRange(req.query);

    // Locked order ids across all pending/paid payouts.
    const locked = await StorePayout.aggregate([
      { $match: { status: { $in: ["pending", "paid"] } } },
      { $unwind: "$orderIds" },
      { $group: { _id: null, ids: { $addToSet: "$orderIds" } } },
    ]);
    const lockedIds = (locked[0]?.ids || []).map(String);

    /*
      The same exclusion aggregatePayable applies, so the two agree.

      This list is what an operator clicks through to a preview. If it counted
      refunded orders and the preview did not, the figure would shrink between
      one screen and the next with nothing to explain why — which is worse than
      either number alone, because it makes both of them untrustworthy.
    */
    const refundedIds = (
      await ReturnRequest.find({ status: "refunded" }).select("order").lean()
    ).map((r) => String(r.order));

    const excluded = [...new Set([...lockedIds, ...refundedIds])];

    const match = {
      isDelivered: true,
      isPaid: true,
      status: "delivered",
      cancelled: { $ne: true },
    };
    if (periodStart || periodEnd) {
      match.deliveredAt = {};
      if (periodStart) match.deliveredAt.$gte = periodStart;
      if (periodEnd) match.deliveredAt.$lte = periodEnd;
    }
    if (excluded.length) {
      match._id = { $nin: excluded.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    const rows = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$store",
          ordersCount: { $sum: 1 },
          grossSales: { $sum: "$itemsPrice" },
          shippingTotal: { $sum: "$shippingPrice" },
        },
      },
      {
        $lookup: {
          from: "stores",
          localField: "_id",
          foreignField: "_id",
          pipeline: [{ $project: { storeName: 1, commission: 1 } }],
          as: "store",
        },
      },
      { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
      { $sort: { grossSales: -1 } },
    ]);

    const stores = rows
      .filter((r) => r.store)
      .map((r) => {
        const rate = Number(r.store.commission || 0);
        const platformFee = Math.round((r.grossSales * rate) / 100 * 100) / 100;
        return {
          storeId: r._id,
          storeName: r.store.storeName,
          ordersCount: r.ordersCount,
          grossSales: r.grossSales,
          shippingTotal: r.shippingTotal,
          commissionRate: rate,
          platformFee,
          netPayable: Math.round((r.grossSales - platformFee) * 100) / 100,
        };
      });

    res.status(200).json({ success: true, stores });
  }
);

// ── ADMIN: create payout doc (locks the orders in) ─────────────────────────
// POST /api/payouts  { store, from, to, notes? }
export const createPayout = controllerWrapper(
  "createPayout",
  async (req, res) => {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const { store: storeId, from, to, notes } = req.body || {};
    if (!storeId) {
      return res.status(400).json({ success: false, message: "store is required" });
    }
    const store = await Store.findById(storeId).select("storeName commission");
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }
    const [periodStart, periodEnd] = parseRange({ from, to });
    if (!periodStart || !periodEnd) {
      return res
        .status(400)
        .json({ success: false, message: "from / to date range is required" });
    }
    const agg = await aggregatePayable(storeId, periodStart, periodEnd);
    if (agg.ordersCount === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No payable orders in this range" });
    }

    const commissionRate = Number(store.commission || 0);
    const platformFee = Math.round((agg.grossSales * commissionRate) / 100 * 100) / 100;
    const netPayable = Math.round((agg.grossSales - platformFee) * 100) / 100;

    const payout = await StorePayout.create({
      store: storeId,
      periodStart,
      periodEnd,
      orderIds: agg.orderIds,
      ordersCount: agg.ordersCount,
      grossSales: agg.grossSales,
      shippingTotal: agg.shippingTotal,
      commissionRate,
      platformFee,
      netPayable,
      currency: "EGP",
      status: "pending",
      notes,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, payout });
  }
);

// ── ADMIN: mark paid ────────────────────────────────────────────────────────
// POST /api/payouts/:id/mark-paid  { method, reference, notes? }
export const markPayoutPaid = controllerWrapper(
  "markPayoutPaid",
  async (req, res) => {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const { method, reference, notes } = req.body || {};
    const allowed = ["bank_transfer", "instapay", "wallet", "manual"];
    if (!method || !allowed.includes(method)) {
      return res.status(400).json({
        success: false,
        message: `method is required (${allowed.join(", ")})`,
      });
    }
    const payout = await StorePayout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }
    if (payout.status === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Payout is already paid" });
    }

    payout.status = "paid";
    payout.method = method;
    payout.reference = reference || undefined;
    if (notes) payout.notes = notes;
    payout.paidAt = new Date();
    payout.paidBy = req.user._id;
    await payout.save();

    res.status(200).json({ success: true, payout });
  }
);

// ── ADMIN: cancel payout (releases its orders so they can be re-included) ──
export const cancelPayout = controllerWrapper(
  "cancelPayout",
  async (req, res) => {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const payout = await StorePayout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }
    if (payout.status === "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot cancel a paid payout" });
    }
    payout.status = "cancelled";
    await payout.save();
    res.status(200).json({ success: true, payout });
  }
);

// ── LIST: admin sees all, vendor sees own ───────────────────────────────────
// GET /api/payouts?store=...&status=...
export const listPayouts = controllerWrapper("listPayouts", async (req, res) => {
  const filter = {};
  if (isAdmin(req.user)) {
    if (req.query.store) filter.store = req.query.store;
  } else if (req.user.role === "store") {
    if (!req.store?._id) {
      return res.status(403).json({ success: false, message: "No store on session" });
    }
    filter.store = req.store._id;
  } else {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  if (req.query.status) filter.status = req.query.status;

  const payouts = await StorePayout.find(filter)
    .populate("store", "storeName logo")
    .sort({ createdAt: -1 })
    .limit(200);

  res.status(200).json({ success: true, payouts });
});

// ── DETAIL: admin or owning vendor ──────────────────────────────────────────
export const getPayout = controllerWrapper("getPayout", async (req, res) => {
  const payout = await StorePayout.findById(req.params.id)
    .populate("store", "storeName logo payoutDetails commission")
    .populate("createdBy", "name email")
    .populate("paidBy", "name email");

  if (!payout) {
    return res.status(404).json({ success: false, message: "Payout not found" });
  }
  if (
    !isAdmin(req.user) &&
    String(payout.store._id) !== String(req.store?._id)
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  res.status(200).json({ success: true, payout });
});

// ── VENDOR: update own payout destination ───────────────────────────────────
// PUT /api/payouts/my-details  { method, accountName, accountNumber, bankName,
//                                 instapayHandle, walletNumber, notes }
export const updateMyPayoutDetails = controllerWrapper(
  "updateMyPayoutDetails",
  async (req, res) => {
    if (req.user.role !== "store" || !req.store?._id) {
      return res
        .status(403)
        .json({ success: false, message: "Store account required" });
    }
    const allowed = [
      "method",
      "accountName",
      "accountNumber",
      "bankName",
      "instapayHandle",
      "walletNumber",
      "notes",
    ];
    const patch = {};
    for (const k of allowed) {
      if (k in (req.body || {})) patch[`payoutDetails.${k}`] = req.body[k];
    }
    const store = await Store.findByIdAndUpdate(
      req.store._id,
      { $set: patch },
      { new: true, runValidators: true }
    ).select("payoutDetails");
    res.status(200).json({ success: true, payoutDetails: store.payoutDetails });
  }
);
