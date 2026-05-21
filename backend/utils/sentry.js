import * as Sentry from "@sentry/node";

let enabled = false;

/** Initialise Sentry. No-op when SENTRY_DSN is unset, so the backend runs
 *  unchanged until a key is provided. Call this once, as early as possible. */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  });
  enabled = true;
  console.log("🛡️  Sentry error monitoring enabled");
}

/** Report an exception when Sentry is enabled; always safe to call. */
export function captureException(error, context) {
  if (!enabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
