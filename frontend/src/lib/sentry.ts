import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

let enabled = false;

/** Initialise Sentry. No-op when VITE_SENTRY_DSN is unset, so it stays dormant
 *  until a key is provided — nothing breaks in the meantime. */
export function initSentry() {
  if (!DSN || import.meta.env.DEV) return;
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    // Trim noise from extensions / network blips.
    ignoreErrors: ["ResizeObserver loop limit exceeded", "Network Error"],
  });
  enabled = true;
}

/** Forward an error to Sentry when enabled; always safe to call. */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!enabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
