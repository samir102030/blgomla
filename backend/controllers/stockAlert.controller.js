import StockAlert from "../models/stockAlert.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";
import { controllerWrapper } from "../utils/wrappers.js";

// Current effective price after an active sale (mirrors frontend getBaseUnitPrice).
export const effectivePrice = (p) => {
  if (p?.saleActive) {
    if (typeof p.salePrice === "number" && p.salePrice > 0) return p.salePrice;
    if (typeof p.salePercentage === "number" && p.salePercentage > 0) {
      return p.price * (1 - p.salePercentage / 100);
    }
  }
  return p?.price ?? 0;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public: subscribe to a back-in-stock or price-drop alert for a product.
export const subscribeStockAlert = controllerWrapper(
  "subscribeStockAlert",
  async (req, res) => {
    const { productId } = req.params;
    const { email, type = "restock" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: "A valid email is required" });
    }
    if (!["restock", "price_drop"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid alert type" });
    }

    const product = await Product.findById(productId).select(
      "price salePrice saleActive salePercentage"
    );
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const update = {
      product: productId,
      email: normalizedEmail,
      type,
      notified: false,
      ...(req.user?._id ? { user: req.user._id } : {}),
      ...(type === "price_drop"
        ? { priceAtSubscribe: effectivePrice(product) }
        : {}),
    };

    // Upsert so re-subscribing resets the baseline and the notified flag.
    await StockAlert.findOneAndUpdate(
      { product: productId, email: normalizedEmail, type },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: "We'll email you when it's available.",
    });
  }
);
