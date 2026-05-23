import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import EmailLog from "../models/emailLog.model.js";
import { sendAbandonedCartEmail, sendReviewRequestEmail } from "../utils/email.js";
import { controllerWrapper } from "../utils/wrappers.js";

const HOUR = 60 * 60 * 1000;

// Shared CRON_SECRET check for all cron endpoints. Returns true if it already
// sent a response (caller should return), false if the request is authorized.
const rejectIfUnauthorized = (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({ success: false, message: "CRON_SECRET not configured" });
    return true;
  }
  const provided =
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
    req.query.secret ||
    "";
  if (provided !== secret) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return true;
  }
  return false;
};

// Recovery sequence: send at 1h, 24h, then 72h of inactivity. Highest stage
// first so a single run only ever sends one (the most advanced) email per user,
// even if the cron missed earlier windows.
const STAGES = [
  { stage: 3, afterMs: 72 * HOUR },
  { stage: 2, afterMs: 24 * HOUR },
  { stage: 1, afterMs: 1 * HOUR },
];

// Max users handled per invocation — keeps the function well under its timeout.
const BATCH_LIMIT = 200;

/**
 * GET /api/cron/cart-recovery
 * Protected by CRON_SECRET (Vercel Cron sends `Authorization: Bearer <secret>`).
 * Emails users with carts idle past each threshold, advancing cartRecovery.stage
 * so a stage is never sent twice.
 */
export const recoverAbandonedCarts = controllerWrapper(
  "recoverAbandonedCarts",
  async (req, res) => {
    if (rejectIfUnauthorized(req, res)) return;

    const now = Date.now();
    const oneHourAgo = new Date(now - 1 * HOUR);

    const candidates = await User.find({
      "cart.0": { $exists: true },
      cartUpdatedAt: { $ne: null, $lte: oneHourAgo },
      "cartRecovery.stage": { $lt: 3 },
      deleted: { $ne: true },
      email: { $ne: null },
    })
      .limit(BATCH_LIMIT)
      .populate("cart.product", "name price salePrice saleActive salePercentage images")
      .populate("cart.collection", "name bundlePrice image");

    let sent = 0;
    const byStage = { 1: 0, 2: 0, 3: 0 };
    const errors = [];

    for (const user of candidates) {
      const idleMs = now - new Date(user.cartUpdatedAt).getTime();
      const currentStage = user.cartRecovery?.stage || 0;

      // Highest stage that is both due and not yet sent.
      const due = STAGES.find(
        (s) => idleMs >= s.afterMs && s.stage > currentStage
      );
      if (!due) continue;

      try {
        const result = await sendAbandonedCartEmail(user, user.cart, due.stage);
        if (result?.skipped) continue; // cart became empty — nothing to advance
        // sendEmail returns null when the provider no-ops or fails; don't burn
        // the stage in that case so the user is retried next run.
        if (!result) {
          errors.push({ user: String(user._id), error: "email not sent" });
          continue;
        }
        // findByIdAndUpdate (not save) so we don't trip the cart pre-save hook.
        await User.findByIdAndUpdate(user._id, {
          $set: {
            "cartRecovery.stage": due.stage,
            "cartRecovery.lastSentAt": new Date(),
          },
        });
        sent += 1;
        byStage[due.stage] += 1;
      } catch (err) {
        errors.push({ user: String(user._id), error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      processed: candidates.length,
      sent,
      byStage,
      ...(errors.length ? { errors } : {}),
    });
  }
);

/**
 * GET /api/cron/post-purchase
 * Sends a review-request email a few days after delivery. Idempotent via the
 * EmailLog collection (so we never touch the order schema). Protected by
 * CRON_SECRET. No-ops cleanly when the mailer (RESEND_API_KEY) isn't configured.
 */
export const runPostPurchaseEmails = controllerWrapper(
  "runPostPurchaseEmails",
  async (req, res) => {
    if (rejectIfUnauthorized(req, res)) return;

    const now = Date.now();
    const windowStart = new Date(now - 10 * 24 * HOUR); // not older than 10 days
    const windowEnd = new Date(now - 3 * 24 * HOUR); // delivered >= 3 days ago

    const orders = await Order.find({
      isDelivered: true,
      deliveredAt: { $gte: windowStart, $lte: windowEnd },
    })
      .limit(BATCH_LIMIT)
      .populate("user", "name email lang locale");

    let sent = 0;
    const errors = [];

    for (const order of orders) {
      if (!order.user?.email) continue;
      const already = await EmailLog.findOne({
        order: order._id,
        type: "review_request",
      });
      if (already) continue;

      try {
        const result = await sendReviewRequestEmail(order.user, order);
        // Mailer no-op/failure returns null — don't log, so it retries next run.
        if (!result) {
          errors.push({ order: String(order._id), error: "email not sent" });
          continue;
        }
        await EmailLog.create({
          order: order._id,
          user: order.user._id,
          type: "review_request",
        });
        sent += 1;
      } catch (err) {
        if (err?.code === 11000) continue; // raced another run — already logged
        errors.push({ order: String(order._id), error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      processed: orders.length,
      sent,
      ...(errors.length ? { errors } : {}),
    });
  }
);

/**
 * GET /api/cron/sale-scheduler
 * Flips scheduled flash sales on/off based on their window. Only touches
 * products that have a scheduled start/end — manual (dateless) sales are left
 * alone. Protected by CRON_SECRET.
 */
export const runSaleScheduler = controllerWrapper(
  "runSaleScheduler",
  async (req, res) => {
    if (rejectIfUnauthorized(req, res)) return;

    const now = new Date();

    // Activate sales whose window has started and not yet ended.
    const activated = await Product.updateMany(
      {
        saleActive: false,
        salePercentage: { $gt: 0 },
        saleStartsAt: { $ne: null, $lte: now },
        $or: [{ saleEndsAt: null }, { saleEndsAt: { $gt: now } }],
      },
      { $set: { saleActive: true } }
    );

    // Expire sales whose end time has passed.
    const expired = await Product.updateMany(
      { saleActive: true, saleEndsAt: { $ne: null, $lte: now } },
      { $set: { saleActive: false } }
    );

    res.status(200).json({
      success: true,
      activated: activated.modifiedCount || 0,
      expired: expired.modifiedCount || 0,
    });
  }
);
