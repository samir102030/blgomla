/**
 * App-wide fallback for images that fail to load.
 *
 * Around seventy `<img>` tags across the app have no `onError` handler, so a
 * 404 from Cloudinary, a hotlink-protected vendor CDN, or an offline moment
 * left a broken-icon gap in the layout. Rather than retrofit a handler onto
 * every call site — a large mechanical diff with a regression in every file
 * it touches — this listens once, at the window, and catches all of them,
 * including any `<img>` added later.
 *
 * `error` events from images do not bubble, but they do run through the
 * capture phase, which is why the listener is registered with `true`. Capture
 * runs before the element's own handler, so the files that already set their
 * own fallback still win: their handler fires afterwards and overwrites this
 * one's placeholder with whatever they prefer.
 */

// Inline SVG: a data URI can never itself 404, which is what makes the
// swap safe to perform unconditionally.
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" fill="#f3f4f6"/>` +
      `<path d="M18 42l9-11 6 7 5-6 8 10z" fill="#d1d5db"/>` +
      `<circle cx="24" cy="24" r="4" fill="#d1d5db"/>` +
      `</svg>`
  );

export const installImageFallback = () => {
  window.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;

      // Guard against a loop if the placeholder ever fails to decode.
      if (target.dataset.fallbackApplied) return;
      target.dataset.fallbackApplied = "1";

      target.src = PLACEHOLDER;
      // Stop the layout from stretching a 64×64 placeholder oddly when the
      // original had no intrinsic size to fall back on.
      target.style.objectFit = target.style.objectFit || "contain";
    },
    true
  );
};

export default installImageFallback;
