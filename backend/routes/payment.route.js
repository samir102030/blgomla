import express from "express";
import { controllerWrapper } from "../utils/wrappers.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { createPayment, verifyStripeWebhook, getStripePaymentIntent, verifyPaymobHmac } from "../utils/payment.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { sendOrderConfirmationEmail } from "../utils/email.js";

const router = express.Router();

/**
 * POST /api/payments/create-intent
 * Creates a payment intent for Stripe or Paymob
 */
router.post(
  "/create-intent",
  verifyToken,
  controllerWrapper("createPaymentIntent", async (req, res) => {
    const { orderId, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "orderId and paymentMethod are required",
      });
    }

    const order = await Order.findById(orderId).populate("orderItems.product");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Verify ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(req.user._id);
    const billingData = {
      email: user.email,
      firstName: user.name?.split(" ")[0] || "Customer",
      lastName: user.name?.split(" ").slice(1).join(" ") || "",
      phone: user.phoneNumber || "01000000000",
      city: "Cairo",
    };

    const items = order.orderItems.map((item) => ({
      name: item.product?.name || "Product",
      price: item.price,
      quantity: item.quantity,
    }));

    try {
      const payment = await createPayment(paymentMethod, {
        amount: order.totalPrice,
        orderId: order._id.toString(),
        billingData,
        items,
        currency: "egp",
      });

      // Update order with payment method
      order.paymentMethod = paymentMethod;
      await order.save();

      res.status(200).json({ success: true, payment });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  })
);

/**
 * POST /api/payments/webhook/stripe
 * Stripe webhook handler — verifies payment and updates order
 */
router.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  controllerWrapper("stripeWebhook", async (req, res) => {
    const sig = req.headers["stripe-signature"];

    try {
      const event = verifyStripeWebhook(req.body, sig);

      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          const order = await Order.findByIdAndUpdate(
            orderId,
            {
              isPaid: true,
              paidAt: new Date(),
              paymentResult: {
                id: paymentIntent.id,
                status: "succeeded",
                update_time: new Date().toISOString(),
                email_address: paymentIntent.receipt_email,
              },
              $push: {
                statusTimeline: {
                  status: "paid",
                  note: "Payment received via Stripe",
                },
              },
            },
            { new: true }
          ).populate("orderItems.product");

          // Send confirmation email
          if (order) {
            const user = await User.findById(order.user);
            if (user) {
              await sendOrderConfirmationEmail(user, order);
            }
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error("[Stripe Webhook] Error:", err.message);
      res.status(400).json({ error: err.message });
    }
  })
);

/**
 * POST /api/payments/webhook/paymob
 * Paymob callback handler
 */
router.post(
  "/webhook/paymob",
  controllerWrapper("paymobWebhook", async (req, res) => {
    const { obj } = req.body;
    const hmac = req.query.hmac || req.body.hmac;

    // HMAC verification is enforced only when PAYMOB_HMAC_SECRET is set.
    // While the Paymob integration is still being provisioned the secret
    // is absent, so we accept the callback but warn loudly so the gap is
    // visible in logs. Once the secret is added in Vercel env, this branch
    // automatically starts rejecting forged/missing-signature callbacks.
    if (process.env.PAYMOB_HMAC_SECRET) {
      if (!obj || !hmac || !verifyPaymobHmac(obj, hmac)) {
        console.warn("[Paymob Webhook] Rejected: invalid or missing HMAC");
        return res.status(401).json({ received: false, error: "Invalid HMAC" });
      }
    } else {
      console.warn(
        "[Paymob Webhook] PAYMOB_HMAC_SECRET not set — accepting callback WITHOUT signature verification. Set this env var before going live."
      );
    }

    if (obj?.success === true) {
      const merchantOrderId = obj?.order?.merchant_order_id;

      if (merchantOrderId) {
        const order = await Order.findByIdAndUpdate(
          merchantOrderId,
          {
            isPaid: true,
            paidAt: new Date(),
            paymentResult: {
              id: String(obj.id),
              status: "succeeded",
              update_time: obj.created_at,
            },
            $push: {
              statusTimeline: {
                status: "paid",
                note: "Payment received via Paymob",
              },
            },
          },
          { new: true }
        ).populate("orderItems.product");

        // Send confirmation email
        if (order) {
          const user = await User.findById(order.user);
          if (user) {
            await sendOrderConfirmationEmail(user, order);
          }
        }
      }
    }

    res.status(200).json({ received: true });
  })
);

/**
 * GET /api/payments/status/:orderId
 * Check payment status for an order
 */
router.get(
  "/status/:orderId",
  verifyToken,
  controllerWrapper("getPaymentStatus", async (req, res) => {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    res.status(200).json({
      success: true,
      isPaid: order.isPaid,
      paymentMethod: order.paymentMethod,
      paymentResult: order.paymentResult,
      paidAt: order.paidAt,
    });
  })
);

export default router;
