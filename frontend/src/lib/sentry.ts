/**
 * Sentry wrapper with dynamic import.
 *
 * `@sentry/react` is ~30KB gzipped. Eagerly importing it puts that weight
 * in the main bundle even when VITE_SENTRY_DSN is unset (dev, preview,
 * environments without an account). This module dynamic-imports the SDK
 * only when a DSN is configured, keeping the critical path lean.
 */

type SentryModule = typeof import("@sentry/react");

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
let sentryPromise: Promise<SentryModule> | null = null;
let initialized = false;

const loadSentry = () => {
  if (!sentryPromise) sentryPromise = import("@sentry/react");
  return sentryPromise;
};

/**
 * Kick off Sentry initialisation. Safe to call multiple times. The dynamic
 * import + scheduler split means the SDK loads after first paint, never
 * blocking LCP. No-ops in dev or when VITE_SENTRY_DSN is unset.
 */
export function initSentry() {
  if (initialized || !DSN || import.meta.env.DEV) return;

  // Schedule for idle/post-paint. requestIdleCallback isn't in Safari yet,
  // so fall back to setTimeout — both push the work off the initial task.
  const schedule =
    (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ??
    ((cb: () => void) => setTimeout(cb, 1));

  schedule(() => {
    loadSentry().then((Sentry) => {
      if (initialized) return;
      Sentry.init({
        dsn: DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        ignoreErrors: ["ResizeObserver loop limit exceeded", "Network Error"],
      });
      initialized = true;
    });
  });
}

/**
 * Forward an error to Sentry when enabled. Safe to call before init
 * resolves — the error gets queued and flushed once the SDK loads.
 */
type PendingError = { error: unknown; context?: Record<string, unknown> };
const pending: PendingError[] = [];

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!DSN || import.meta.env.DEV) return;

  if (!initialized) {
    pending.push({ error, context });
    loadSentry().then((Sentry) => {
      // Flush anything queued before init completed.
      for (const p of pending.splice(0)) {
        Sentry.captureException(p.error, p.context ? { extra: p.context } : undefined);
      }
    });
    return;
  }

  loadSentry().then((Sentry) => {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  });
}
