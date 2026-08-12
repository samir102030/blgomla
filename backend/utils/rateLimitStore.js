import mongoose from "mongoose";

/**
 * A shared store for express-rate-limit, backed by the Mongo connection we
 * already hold.
 *
 * express-rate-limit's default store keeps its counters in process memory.
 * That works for one long-lived server and fails quietly on Vercel: every
 * warm Lambda gets its own counters, so the effective limit is
 * `max × number of live instances` and it resets whenever a container is
 * recycled. The auth limiter — 10 attempts per 15 minutes on login, signup,
 * password reset — was the one that mattered: an attacker spraying passwords
 * gets a fresh budget from every new instance.
 *
 * Using Mongo keeps this to one moving part. Redis would be faster, but it
 * would also be a new service to run, and rate-limit counters are small,
 * short-lived writes that Mongo handles comfortably.
 */

const rateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

// Mongo's TTL monitor only sweeps about once a minute, so expired documents
// linger. Every read below filters on `expiresAt` explicitly and never trusts
// a stale row; this index exists to stop the collection growing without bound.
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimitHit =
  mongoose.models.RateLimitHit || mongoose.model("RateLimitHit", rateLimitSchema);

export class MongoRateLimitStore {
  constructor({ prefix = "rl" } = {}) {
    this.prefix = prefix;
    this.windowMs = 60_000;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  scopedKey(key) {
    return `${this.prefix}:${key}`;
  }

  /**
   * The limiter runs before the DB-connect middleware in app.js, and
   * bufferCommands is off, so a query issued while disconnected throws
   * immediately. Skip the store in that case: during a Mongo outage nothing
   * behind the limiter can succeed anyway, and a throw here would turn a
   * database blip into a 500 on every single route.
   */
  get available() {
    return mongoose.connection.readyState === 1;
  }

  async increment(key) {
    const now = Date.now();
    const resetTime = new Date(now + this.windowMs);

    if (!this.available) {
      return { totalHits: 1, resetTime };
    }

    const scoped = this.scopedKey(key);

    try {
      // Fast path: a window is already open for this key.
      const live = await RateLimitHit.findOneAndUpdate(
        { key: scoped, expiresAt: { $gt: new Date(now) } },
        { $inc: { count: 1 } },
        { new: true }
      );
      if (live) {
        return { totalHits: live.count, resetTime: live.expiresAt };
      }

      // No live window — either the key is new or the previous window lapsed.
      // The upsert covers both: it overwrites an expired row in place.
      const opened = await RateLimitHit.findOneAndUpdate(
        { key: scoped },
        { $set: { count: 1, expiresAt: resetTime } },
        { new: true, upsert: true }
      );
      return { totalHits: opened.count, resetTime: opened.expiresAt };
    } catch (error) {
      // Two requests racing to open the same window: one upsert wins, the
      // other gets a duplicate-key error. The winner's window is live now, so
      // just join it.
      if (error.code === 11000) {
        const raced = await RateLimitHit.findOneAndUpdate(
          { key: scoped },
          { $inc: { count: 1 } },
          { new: true }
        );
        if (raced) {
          return { totalHits: raced.count, resetTime: raced.expiresAt };
        }
      }
      console.error("[rateLimitStore] increment failed:", error.message);
      // Fail open rather than locking every caller out on a storage error.
      return { totalHits: 1, resetTime };
    }
  }

  /** Used by `skipSuccessfulRequests` to refund a request that succeeded. */
  async decrement(key) {
    if (!this.available) return;
    try {
      await RateLimitHit.updateOne(
        { key: this.scopedKey(key), count: { $gt: 0 } },
        { $inc: { count: -1 } }
      );
    } catch (error) {
      console.error("[rateLimitStore] decrement failed:", error.message);
    }
  }

  async resetKey(key) {
    if (!this.available) return;
    try {
      await RateLimitHit.deleteOne({ key: this.scopedKey(key) });
    } catch (error) {
      console.error("[rateLimitStore] resetKey failed:", error.message);
    }
  }

  async resetAll() {
    if (!this.available) return;
    try {
      await RateLimitHit.deleteMany({ key: new RegExp(`^${this.prefix}:`) });
    } catch (error) {
      console.error("[rateLimitStore] resetAll failed:", error.message);
    }
  }
}

export default MongoRateLimitStore;
