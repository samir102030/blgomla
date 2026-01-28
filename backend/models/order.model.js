import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
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
});

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
    paymentMethod: { type: String, required: true },
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
    totalPrice: { type: Number, required: true },
    couponCode: { type: String }, // Applied coupon code
    couponDiscount: { type: Number, default: 0 }, // Total coupon discount
    discountPrice: { type: Number, default: 0 }, // Total discount (coupon + sale)
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    cancelled: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
