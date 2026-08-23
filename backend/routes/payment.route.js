import express from "express";
import { controllerWrapper } from "../utils/wrappers.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { reachesAllStores } from "../utils/permissions.js";
import {
  createPayment,
  verifyStripeWebhook,
  getStripePaymentIntent,
  verifyPaymobHmac,
  verifyTabbyWebhook,
  verifyTamaraWebhook,
} from "../utils/payment.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { sendOrderConfirmationEmail } from "../utils/email.js";

import {
  isPaymentMethod,
  isConfigured,
  missingConfigFor,
  paymentMethodStatus,
} from "../config/paymentMethods.js";

const router = express.Router();

/**
 * GET /api/payments/methods
 *
 * Which methods the shop takes, and which of them this server can complete
 * today. Booleans and setting names only — never a value.
 *
 * Public because the checkout page needs it before anybody has signed in, and
 * because it says nothing that is not already visible from trying to pay.
 */
router.get("/methods", (req, res) => {
  res.status(200).json({ success: true, methods: paymentMethodStatus() });
});

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

    if (!isPaymentMethod(paymentMethod)) {
      return res
        .status(400)
        .json({ success: false, message: "That payment method is not one this shop takes." });
    }

    /*
      A gateway whose credentials are not on this server cannot be completed,
      and finding that out from whatever the gateway's own client library
      throws is how a customer ends up looking at a blank error at the last
      step of a checkout. Stopped here instead, with the reason in the log for
      whoever has to fix it and a sentence for the person waiting.

      The names of the missing settings are deliberately not sent to the
      customer: they are of no use to them and they describe the inside of the
      server. Never their values, which are not read here at all.
    */
    if (!isConfigured(paymentMethod)) {
      console.error(
        `payment method ${paymentMethod} was selected but is not configured; missing: ${missingConfigFor(
          paymentMethod
        ).join(", ")}`
      );
      return res.status(503).json({
        success: false,
        message:
          "This payment method is not available right now. Please choose another, or contact us and we will take the order over the phone.",
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

    // Fail closed. A missing secret is a misconfiguration, not a licence to
    // trust the caller — without it anyone can POST {obj:{success:true}} and
    // mark any order paid.
    if (!process.env.PAYMOB_HMAC_SECRET) {
      console.error(
        "[Paymob Webhook] PAYMOB_HMAC_SECRET not set — rejecting callback. Set this env var before taking Paymob payments."
      );
      return res
        .status(503)
        .json({ received: false, error: "Webhook verification not configured" });
    }
    if (!obj || !hmac || !verifyPaymobHmac(obj, hmac)) {
      console.warn("[Paymob Webhook] Rejected: invalid or missing HMAC");
      return res.status(401).json({ received: false, error: "Invalid HMAC" });
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
 * POST /api/payments/webhook/tabby
 * Tabby callback — HMAC-signed by the merchant secret. We need the raw body
 * for the signature check, so the express.json() middleware is bypassed here
 * via express.raw and re-parsed locally.
 */
router.post(
  "/webhook/tabby",
  express.raw({ type: "application/json" }),
  controllerWrapper("tabbyWebhook", async (req, res) => {
    const sig = req.headers["x-tabby-signature"] || req.headers["tabby-signature"];

    // Fail closed — see the Paymob handler above for the reasoning.
    if (!process.env.TABBY_WEBHOOK_SECRET && !process.env.TABBY_SECRET_KEY) {
      console.error(
        "[Tabby Webhook] TABBY_WEBHOOK_SECRET / TABBY_SECRET_KEY not set — rejecting callback."
      );
      return res
        .status(503)
        .json({ received: false, error: "Webhook verification not configured" });
    }
    if (!verifyTabbyWebhook(req.body, sig)) {
      console.warn("[Tabby Webhook] Rejected: invalid signature");
      return res.status(401).json({ received: false, error: "Invalid signature" });
    }

    let payload;
    try {
      payload = JSON.parse(req.body.toString("utf8"));
    } catch {
      return res.status(400).json({ received: false, error: "Malformed JSON" });
    }

    const orderId = payload?.order?.reference_id;
    const status = payload?.status; // "AUTHORIZED" | "CLOSED" | "EXPIRED" | "REJECTED" | …
    const paid = status === "AUTHORIZED" || status === "CLOSED";

    if (orderId && paid) {
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          isPaid: true,
          paidAt: new Date(),
          paymentResult: {
            id: String(payload?.id || payload?.payment?.id || ""),
            status: "succeeded",
            update_time: new Date().toISOString(),
          },
          $push: {
            statusTimeline: { status: "paid", note: "Payment received via Tabby" },
          },
        },
        { new: true }
      ).populate("orderItems.product");

      if (order) {
        const user = await User.findById(order.user);
        if (user) await sendOrderConfirmationEmail(user, order);
      }
    }

    res.status(200).json({ received: true });
  })
);

/**
 * POST /api/payments/webhook/tamara
 * Tamara callback — authenticated by a static `tamara-token` header that
 * we configure in their dashboard and compare against TAMARA_NOTIFICATION_TOKEN.
 */
router.post(
  "/webhook/tamara",
  controllerWrapper("tamaraWebhook", async (req, res) => {
    const token = req.headers["tamara-token"] || req.headers["x-tamara-token"];

    // Fail closed — see the Paymob handler above for the reasoning.
    if (!process.env.TAMARA_NOTIFICATION_TOKEN) {
      console.error(
        "[Tamara Webhook] TAMARA_NOTIFICATION_TOKEN not set — rejecting callback."
      );
      return res
        .status(503)
        .json({ received: false, error: "Webhook verification not configured" });
    }
    if (!verifyTamaraWebhook(token)) {
      console.warn("[Tamara Webhook] Rejected: invalid token");
      return res.status(401).json({ received: false, error: "Invalid token" });
    }

    const orderId = req.body?.order_reference_id;
    const status = req.body?.order_status; // "approved" / "authorised" / "fully_captured" / "declined" / "expired"
    const paid =
      status === "authorised" ||
      status === "fully_captured" ||
      status === "approved";

    if (orderId && paid) {
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          isPaid: true,
          paidAt: new Date(),
          paymentResult: {
            id: String(req.body?.order_id || ""),
            status: "succeeded",
            update_time: new Date().toISOString(),
          },
          $push: {
            statusTimeline: { status: "paid", note: "Payment received via Tamara" },
          },
        },
        { new: true }
      ).populate("orderItems.product");

      if (order) {
        const user = await User.findById(order.user);
        if (user) await sendOrderConfirmationEmail(user, order);
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
      !(await reachesAllStores(req.user))
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
