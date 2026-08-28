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

import { backupUrl, externalBackupUrl } from "./imageBackup";

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

/*
  Before a grey square: the mirror.

  Every picture the shop renders is copied weekly into a separate repository
  and served from jsDelivr's CDN, on infrastructure that has nothing to do
  with Cloudinary. The address is derivable from the failing one — see
  `imageBackup.ts` — so this costs no request to find out, which matters at
  the one moment it runs, when the network has already failed once.

  A grey placeholder is what the shop looks like when Cloudinary is having a
  bad afternoon. The mirror is what it looks like when it is not. One attempt
  only: the retry counter is marked exhausted on the way, so a mirror that
  fails too lands on the placeholder immediately instead of restarting the
  whole ladder against a different host.
*/
const aimAt = (img: HTMLImageElement, mirror: string) => {
  img.dataset.retried = String(RETRY_DELAYS_MS.length);
  // srcset outranks src and still points at the host that just failed.
  img.removeAttribute("srcset");
  // A new attempt gets its own deadline rather than inheriting a spent one.
  delete img.dataset.watchedAt;
  img.src = mirror;
};

const useMirror = (img: HTMLImageElement): boolean => {
  if (img.dataset.mirrorTried) return false;
  const original = img.dataset.originalSrc || img.currentSrc || img.src;

  const mirror = backupUrl(original);
  if (mirror) {
    img.dataset.mirrorTried = "1";
    aimAt(img, mirror);
    return true;
  }

  /*
    A picture on somebody else's server has a mirror too — filed under a hash
    of its address rather than a public id, because it has no public id to file
    under. Four thousand products are still hot-linked to cdn.shopify.com from
    an import that has not been through the image migration, and until it has,
    this is the only thing standing between one bad afternoon at that host and
    a third of the catalogue showing grey squares.

    The address has to be hashed, and the browser's digest is asynchronous, so
    unlike the branch above this cannot answer in the same tick. It claims the
    attempt immediately — `mirrorTried` before the await, so a second error on
    the same picture cannot start a second one — and paints the placeholder
    itself if the hash turns out to be unavailable.
  */
  if (!/^https?:\/\//i.test(original)) return false;
  img.dataset.mirrorTried = "1";
  externalBackupUrl(original).then((external) => {
    if (external) aimAt(img, external);
    else paintPlaceholder(img);
  });
  return true;
};

/** The grey square, and the mark that stops anything trying again. */
const paintPlaceholder = (img: HTMLImageElement) => {
  img.dataset.fallbackApplied = "1";
  img.src = PLACEHOLDER;
  // Stop the layout from stretching a 64×64 placeholder oddly when the
  // original had no intrinsic size to fall back on.
  img.style.objectFit = img.style.objectFit || "contain";
};

/** Applied by both paths, so a give-up looks the same however it was reached. */
const giveUp = (img: HTMLImageElement) => {
  if (useMirror(img)) return;
  paintPlaceholder(img);
};

/*
  A picture that never answers is a failure too.

  Everything above waits for an `error` event, and a host that refuses a
  connection sends one immediately. A host that has simply stopped answering
  does not: free-electronic.com holds the connection open and says nothing for
  eighteen seconds before the browser gives up on it. Two retries behind that,
  each paying the same eighteen seconds, and the placeholder arrives the better
  part of a minute after the page did.

  What that looks like is the broken-image icon and the alt text, sitting in
  the layout for the whole minute — which is worse than the grey square the
  retries were protecting, and it is what the Electronics department card shows
  today for exactly this reason.

  So: a picture that has not loaded within DEADLINE_MS is given the placeholder
  whether or not anything has been reported about it. The retry logic still
  runs underneath, and if the real image arrives late it simply replaces the
  placeholder, because a completed load overwrites nothing.

  Ten seconds, not three: a first-time visitor on a slow phone connection
  loading ninety pictures should not be handed grey squares for pictures that
  were going to arrive.
*/
const DEADLINE_MS = 10000;
const SWEEP_MS = 2000;

/*
  A picture the browser has decided not to fetch yet is not a slow picture.

  `loading="lazy"` is a promise the browser makes to itself: it holds the
  request until the image comes near the viewport. The sweep below cannot see
  that decision. An element sitting four screens down has a `src`, is not
  `complete`, and has a `naturalWidth` of zero — which is indistinguishable,
  from here, from a host that accepted the connection and then went quiet.

  Measured on the live home page: 107 pictures, 100 of them lazy and 81 below
  the fold. Ten seconds after load, with nobody having scrolled, 22 of them had
  been pushed onto the mirror and 11 had been handed the grey placeholder —
  every one of the 11 lazy, and every one below the fold. Not a single byte had
  been requested for any of them. The department rail rendering as six grey
  squares is this, not a picture problem: the pictures were fine and were still
  waiting their turn.

  Guessing the distance at which the browser starts fetching does not work.
  A first attempt allowed a screen's worth of margin, on the reasoning that
  Chrome's own lazy threshold is wider than that. Measured on the live home
  page it still handed out sixteen placeholders, and
  `performance.getEntriesByType("resource")` showed **zero** requests for any
  of them: the department rail sits 226px below the fold, comfortably inside
  an 800px margin, and with nobody scrolling the browser had simply never
  asked for it. The threshold is the browser's business, it moves with
  connection speed and layout, and it is not observable from here.

  So the rule is not a distance at all. The clock runs only while the picture
  is actually on screen — which is also the only time a grey square is
  something a visitor can see. Off screen the clock is cleared rather than
  paused, so a picture gets its full ten seconds from the moment it is
  scrolled into view.

  This covers the cards parked off the side of a horizontal rail too, and it
  needs no guess about eager images either: one that is off screen and broken
  is not worth a placeholder until somebody looks at it, and the `error`
  handler above still catches it the moment the request genuinely fails.
*/
const isOnScreen = (img: HTMLImageElement): boolean => {
  const box = img.getBoundingClientRect();
  // A zero box is a picture inside something hidden or not laid out. It has
  // no position to judge, and nobody is looking at it.
  if (box.width === 0 && box.height === 0) return false;
  return (
    box.bottom > 0 &&
    box.top < window.innerHeight &&
    box.right > 0 &&
    box.left < window.innerWidth
  );
};

const watchForSilence = () => {
  window.setInterval(() => {
    const now = Date.now();
    for (const img of Array.from(document.images)) {
      if (img.dataset.fallbackApplied) continue;
      if (img.complete && img.naturalWidth > 0) continue;
      if ((img.currentSrc || img.src || "").startsWith("data:")) continue;
      // No src yet is not a slow load — it is a picture nobody has asked for.
      if (!img.getAttribute("src") && !img.getAttribute("srcset")) continue;
      // Neither is a picture parked off screen. Clear the clock rather than
      // pause it, so it gets its full allowance when it scrolls in.
      if (!isOnScreen(img)) {
        delete img.dataset.watchedAt;
        continue;
      }

      const since = Number(img.dataset.watchedAt || 0);
      if (!since) {
        img.dataset.watchedAt = String(now);
        continue;
      }
      if (now - since >= DEADLINE_MS) giveUp(img);
    }
  }, SWEEP_MS);
};

export const installImageFallback = () => {
  watchForSilence();

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

      // One retry against the original host is a fair allowance for a busy
      // moment. A second failure is better answered by a different host than
      // by asking the same one a third time.
      if (tried >= 1 && useMirror(target)) return;

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
          // The deadline restarts with the new attempt, so a retry gets its
          // own ten seconds rather than inheriting a clock that has already
          // run out.
          delete target.dataset.watchedAt;
          target.src =
            original + (original.includes("?") ? "&" : "?") + "r=" + (tried + 1);
        }, RETRY_DELAYS_MS[tried]);
        return;
      }

      giveUp(target);
    },
    true
  );
};

export default installImageFallback;
