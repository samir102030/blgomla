// GA4 wrapper. Reads measurement ID from VITE_GA_MEASUREMENT_ID; no-ops if missing.
// Loads gtag.js on first use so dev builds without the env var stay clean.

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
