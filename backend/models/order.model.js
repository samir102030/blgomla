import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
    },
    collectionName: { type: String },
    quantity: { type: Number, required: [true, "Quantity is required"] },
    price: { type: Number, required: true }, // Price at time of purchase
    salePercentage: { type: Number, default: 0 }, // Sale percentage at time of purchase
    couponDiscount: { type: Number, default: 0 }, // Coupon discount applied to this item
    variant: {
      label: { type: String },
      sku: { type: String },
    },
  },
  { suppressReservedKeysWarning: true },
);

const statusTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "paid", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"],
      required: true,
    },
    note: { type: String },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "stripe", "paymob", "paymob_installment", "tabby", "tamara"],
      required: true,
    },
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, default: 0 },
    taxPrice: { type: Number, default: 0 },
    // On-site fitting the customer opted into, summed across the bundles in
    // this order. Kept out of itemsPrice: it is labour, not stock, so it must
    // not be discounted by a coupon or dragged into per-item allocation.
    installationPrice: { type: Number, default: 0 },
    // Which bundles it covers, so the warehouse and the invoice can say what
    // was actually promised rather than showing an unexplained line.
    installationFor: [
      {
        _id: false,
        collection: { type: mongoose.Schema.Types.ObjectId, ref: "Collection" },
        collectionName: String,
        quantity: { type: Number, default: 1 },
        price: { type: Number, default: 0 },
      },
    ],
    totalPrice: { type: Number, required: true },
    couponCode: { type: String }, // Applied coupon code
    couponDiscount: { type: Number, default: 0 }, // Total coupon discount
    discountPrice: { type: Number, default: 0 }, // Total discount (coupon + sale)
    // ── Loyalty points ──
    pointsRedeemed: { type: Number, default: 0 }, // points spent on this order
    pointsEarned: { type: Number, default: 0 }, // points awarded on delivery
    pointsAwarded: { type: Boolean, default: false }, // guard against double-award
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
    },
    // ── Status Timeline for order tracking ──
    statusTimeline: [statusTimelineSchema],
    cancelled: { type: Boolean, default: false },
    notes: { type: String },
    // ── Tracking info ──
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    estimatedDelivery: { type: Date },
    // Carrier shipment reference (e.g. Accurate). trackingNumber mirrors
    // shipment.code for backwards-compatible display.
    shipment: {
      provider: { type: String },
      id: { type: Number },
      code: { type: String },
      status: { type: String },
      syncedAt: { type: Date },
    },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

// Index for performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ store: 1, status: 1 });
orderSchema.index({ isPaid: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
