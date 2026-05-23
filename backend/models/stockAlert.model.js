import mongoose from "mongoose";

// Demand capture: shoppers ask to be emailed when an item is back in stock or
// drops in price. Anonymous-friendly (email required, user optional).
const stockAlertSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["restock", "price_drop"],
      default: "restock",
    },
    // For price_drop: the effective price when the shopper subscribed.
    priceAtSubscribe: { type: Number },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One active subscription per (product, email, type).
stockAlertSchema.index({ product: 1, email: 1, type: 1 }, { unique: true });
stockAlertSchema.index({ type: 1, notified: 1, product: 1 });

const StockAlert = mongoose.model("StockAlert", stockAlertSchema);
export default StockAlert;
