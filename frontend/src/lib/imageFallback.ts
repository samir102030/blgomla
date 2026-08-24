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
 *
 * ## Why it tries twice
 *
 * Every picture in this shop is still a link to somebody else's server while
 * the images are being migrated, and those servers are neither fast nor
 * always up. Measured on one afternoon: egyptlaptop.com answered in 0.68s,
 * our own Cloudinary in 0.56s, and free-electronic.com did not answer at all —
 * fifteen seconds, no bytes, no status code. A catalogue page asks for two
 * dozen pictures at once and a category rail for six.
 *
 * Giving up on the first error turned a request that timed out behind thirty
 * others into a product that looked like it had no photograph, for the rest
 * of the visit. On a shop whose pictures are its stock, that reads as an empty
 * catalogue rather than a slow one. So: one more attempt, after a moment,
 * with a cache-buster so the browser does not hand back the failure it has
 * already stored. Only then the placeholder.
 */

// Inline SVG: a data URI can never itself 404, which is what makes the
// swap safe to perform unconditionally.

/*
  Two retries, not one, and the second waits considerably longer.

  One retry after 900ms turned out to be a thin margin against the servers
  these pictures are still hot-linked to. Both are ordinary shared hosting:
  egyptlaptop.com answers in 0.7s most of the time and 2.2s when it is busy,
  and free-electronic.com refuses connections outright for hours and then
  comes back. A page asks for ninety pictures at once.

  What that looked like: a home page where the department rail rendered as six
  grey squares while every product picture beside it loaded, because the six
  happened to be queued behind the slow moment. And it stays that way — the
  guard below is permanent for the page, deliberately, so a placeholder that
  cannot decode does not loop. So one unlucky second is a grey rail until the
  visitor reloads.

  Backing off 900ms then 2.5s covers a host having a bad moment without
  hammering one that is genuinely down: three attempts total, spread over
  three and a half seconds. A 404 costs one extra request, which is nothing.

  The real fix is not here — it is the pictures living on our own CDN instead
  of somebody else's shared host, which is what the image migration is for.
  This is what keeps the shop looking whole until that finishes.
*/
const RETRY_DELAYS_MS = [900, 2500];

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

      // A failure buys another try rather than a grey square, twice, with a
      // longer wait the second time. A data: URI cannot itself fail, so a
      // placeholder that errors would mean something stranger than a slow
      // host — leave that to the branch below.
      const tried = Number(target.dataset.retried || 0);
      if (tried < RETRY_DELAYS_MS.length && !target.src.startsWith("data:")) {
        target.dataset.retried = String(tried + 1);
        // The address as it was first asked for, not the one carrying the
        // previous attempt's cache-buster — otherwise each retry stacks
        // another ?r= on the last and the URL grows with every failure.
        const original =
          target.dataset.originalSrc || target.currentSrc || target.src;
        target.dataset.originalSrc = original;
        // srcset outranks src, so a stale candidate there would quietly undo
        // the retry by reloading the same failing address.
        target.removeAttribute("srcset");
        window.setTimeout(() => {
          target.src =
            original + (original.includes("?") ? "&" : "?") + "r=" + (tried + 1);
        }, RETRY_DELAYS_MS[tried]);
        return;
      }

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
