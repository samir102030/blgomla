// GA4 wrapper. Reads measurement ID from VITE_GA_MEASUREMENT_ID; no-ops if missing.
// Loads gtag.js on first use so dev builds without the env var stay clean.
import { axiosInstance } from "./axios";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as
  | string
  | undefined;

let loaded = false;

function ensureLoaded(): boolean {
  if (!MEASUREMENT_ID) return false;
  if (loaded) return true;
  if (typeof window === "undefined") return false;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // send_page_view: false — we fire page_view manually on route change so SPA navigations are captured.
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false });

  loaded = true;
  return true;
}

export function trackPageView(path: string, title?: string): void {
  if (!ensureLoaded()) return;
  window.gtag!("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
}

export function trackEvent(
  name: string,
  params: Record<string, unknown> = {}
): void {
  if (!ensureLoaded()) return;
  window.gtag!("event", name, params);
}

export const analyticsEnabled = Boolean(MEASUREMENT_ID);

// ── First-party behavioral capture (our own backend, not GA) ──
// Stable anonymous session id so events group without requiring login.
const behaviorSessionId = (): string | undefined => {
  try {
    let s = localStorage.getItem("sid");
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("sid", s);
    }
    return s;
  } catch {
    return undefined;
  }
};

type BehaviorType = "view" | "add_to_cart" | "search" | "checkout_start";

// Fire-and-forget event to POST /analytics/events. Never blocks/throws into UI.
export function trackBehavior(
  type: BehaviorType,
  payload: { product?: string; query?: string; meta?: Record<string, unknown> } = {}
): void {
  try {
    axiosInstance
      .post("/analytics/events", { type, sessionId: behaviorSessionId(), ...payload })
      .catch(() => {});
  } catch {
    // ignore
  }
}
