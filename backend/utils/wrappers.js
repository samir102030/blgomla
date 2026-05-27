import { captureException } from "./sentry.js";

/**
 * Classify thrown errors and turn them into JSON responses with the right
 * HTTP status. Keeps controllers terse (they just throw) while clients
 * always get a stable `{ success: false, message }` envelope.
 *
 *   - Mongoose ValidationError → 400 with field details
 *   - Mongoose CastError       → 400 (bad ObjectId, etc.)
 *   - Duplicate key (E11000)   → 409
 *   - JWT errors               → 401
 *   - HTTP errors with .status → that status
 *   - Everything else          → 500 (and Sentry'd)
 *
 * In production we never leak the raw error message for true 500s — the
 * client gets a generic message and Sentry gets the full stack.
 */
const classifyError = (err) => {
  // Already-shaped HTTP error
  if (err.status && Number.isInteger(err.status)) {
    return { status: err.status, message: err.message };
  }

  // Mongoose validation
  if (err.name === "ValidationError" && err.errors) {
    const details = Object.values(err.errors)
      .map((e) => e.message)
      .filter(Boolean)
      .join("; ");
    return {
      status: 400,
      message: details || "Validation failed",
    };
  }

  // Mongoose bad cast (invalid ObjectId, type mismatch, etc.)
  if (err.name === "CastError") {
    return {
      status: 400,
      message: `Invalid ${err.path || "value"}`,
    };
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    return {
      status: 409,
      message: field
        ? `That ${field} is already in use`
        : "Duplicate entry",
    };
  }

  // JWT
  if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError" ||
    err.name === "NotBeforeError"
  ) {
    return { status: 401, message: "Invalid or expired session" };
  }

  // Mongoose disconnected — surface as 503 so retries make sense
  if (
    err.name === "MongooseError" ||
    err.name === "MongoNetworkError" ||
    /buffering timed out|connection.*closed|server selection/i.test(err.message || "")
  ) {
    return {
      status: 503,
      message: "Database temporarily unavailable. Please retry shortly.",
    };
  }

  return { status: 500, message: err.message || "Internal Server Error" };
};

export const controllerWrapper = (controllerName, fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const { status, message } = classifyError(error);

      // Real 500s get captured to Sentry. Expected 4xx noise does not.
      if (status >= 500) {
        console.error(`[${controllerName}]`, error);
        captureException(error, {
          controller: controllerName,
          path: req.originalUrl,
          method: req.method,
          userId: req.user?._id,
        });
      } else {
        console.warn(`[${controllerName}] ${status}: ${message}`);
      }

      // Prod hides the raw 500 detail; everything else is safe to echo.
      const safeMessage =
        status >= 500 && process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : message;

      if (res.headersSent) {
        return next(error);
      }
      return res.status(status).json({
        success: false,
        message: safeMessage,
      });
    }
  };
};
