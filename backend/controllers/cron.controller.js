import User from "../models/user.model.js";
import { sendAbandonedCartEmail } from "../utils/email.js";
import { controllerWrapper } from "../utils/wrappers.js";

const HOUR = 60 * 60 * 1000;

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
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return res
        .status(503)
        .json({ success: false, message: "CRON_SECRET not configured" });
    }
    const auth = req.headers.authorization || "";
    const provided =
      auth.replace(/^Bearer\s+/i, "") || req.query.secret || "";
    if (provided !== secret) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

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
