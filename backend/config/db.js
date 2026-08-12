import mongoose from "mongoose";

/**
 * Serverless-friendly Mongo connection.
 *
 * Vercel Functions run as warm Lambda-like containers: code is loaded once
 * and reused across invocations until the container is recycled. We must:
 *   1. Cache the connection on globalThis so consecutive invocations share
 *      the same pool (Mongoose's internal cache is per-import, which broke
 *      with Vercel's dev/edge bundlers).
 *   2. Reset the cached promise on failure, otherwise a single transient
 *      DNS hiccup pins the rejection on every future request until the
 *      container is recycled.
 *   3. Disable mongoose command buffering — when bufferCommands is on, a
 *      slow connection turns into a 30-second hang on every query.
 *      Failing fast lets the user retry instead of waiting.
 *   4. Keep the pool tiny: each warm Lambda holds its own connections, so
 *      with maxPoolSize: 10 across 50 concurrent invocations you'd open
 *      500 sockets to Atlas and hit the cluster's connection cap.
 */

mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

// `collection` is a reserved schema pathname in Mongoose. We use it
// intentionally on the User model. Silence the noisy boot warning.
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (
    warning.name === "MongooseWarning" &&
    /reserved schema pathname/i.test(warning.message)
  ) {
    return;
  }
  console.warn(warning);
});

// One unhandled-rejection logger per process. Without this, a stray
// `.then(...)` with no `.catch` silently swallows DB errors.
if (!globalThis.__rejectHandlerInstalled) {
  globalThis.__rejectHandlerInstalled = true;
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });
}

/**
 * @typedef {Object} MongoCache
 * @property {import("mongoose").Mongoose | null} conn
 * @property {Promise<import("mongoose").Mongoose> | null} promise
 */
/** @type {MongoCache} */
const cached =
  globalThis.__mongoose ??
  (globalThis.__mongoose = { conn: null, promise: null });

/**
 * Attach the connection listeners exactly once per process.
 *
 * These used to be registered inside the `if (!cached.promise)` branch, on
 * the theory that the branch runs once. It doesn't: the `.catch` below resets
 * `cached.promise` to null so the next request can retry, which means every
 * failed attempt re-entered the branch and bound another three listeners.
 * During a Mongo outage that climbs until Node starts printing
 * MaxListenersExceededWarning, and each stale listener keeps its closure
 * alive. A module-level flag is the thing that's actually once-per-process.
 */
const installConnectionListeners = () => {
  if (globalThis.__mongoListenersInstalled) return;
  globalThis.__mongoListenersInstalled = true;

  mongoose.connection.on("connected", () => {
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
  });
  mongoose.connection.on("error", (err) => {
    console.error("[mongo] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] disconnected — next request will reconnect");
    cached.conn = null;
  });
};

const connectDB = async () => {
  // Reuse an already-good connection across warm Lambda invocations.
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        // Fail fast — user retries beat a 30-second hang.
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,

        // Pool — tuned for serverless. minPoolSize: 0 lets idle Lambdas
        // shrink to nothing; maxIdleTimeMS recycles sockets the cluster
        // would have closed anyway.
        maxPoolSize: 5,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,

        // Resilience — driver auto-retries one-shot read/write idempotently.
        retryWrites: true,
        retryReads: true,

        // Heartbeat that catches dropped sockets a little sooner.
        heartbeatFrequencyMS: 10000,
      })
      .then((m) => {
        cached.conn = m;
        return m;
      })
      .catch((err) => {
        // Reset so the next request retries instead of replaying the
        // failed promise forever.
        cached.promise = null;
        throw err;
      });

    installConnectionListeners();
  }

  return cached.promise;
};

export default connectDB;
