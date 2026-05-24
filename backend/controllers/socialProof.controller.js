import Order from "../models/order.model.js";

// Public: recent purchases for social-proof toasts. Anonymized — first name +
// city + product only. No emails, no full names, no order totals.
export const getRecentPurchases = async (req, res) => {
  try {
    const orders = await Order.find({ cancelled: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("user", "name")
      .populate("shippingAddress", "city state")
      .populate("orderItems.product", "name nameAr images")
      .lean();

    const purchases = [];
    for (const order of orders) {
      const item = (order.orderItems || []).find((i) => i.product);
      if (!item || !item.product) continue;

      const fullName = order.user?.name || "";
      const firstName = fullName.trim().split(/\s+/)[0] || "Someone";

      purchases.push({
        firstName,
        city: order.shippingAddress?.city || order.shippingAddress?.state || "",
        product: item.product.name,
        productAr: item.product.nameAr || "",
        image: item.product.images?.[0]?.url || "",
        createdAt: order.createdAt,
      });
      if (purchases.length >= 12) break;
    }

    return res.json({ success: true, purchases });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};
