/**
 * Where a picture's second copy lives.
 *
 * Every photograph the shop renders is mirrored onto this repository's own
 * `images` branch by a job that runs on its own every Sunday. jsDelivr serves
 * that branch as a CDN for free, which is what turns the mirror from a cold
 * archive into something the site can actually fall back to while a visitor is
 * looking at it.
 *
 * A branch rather than a folder on `main`: the mirror is about a gigabyte and
 * a half, and on `main` every Vercel deployment would clone it. On its own
 * branch the build never sees it, while GitHub still holds it and jsDelivr
 * still serves it.
 *
 * ## Why this is a string transform and not a lookup
 *
 * The mirror files each picture under its Cloudinary public id, unchanged —
 * no hash, no shard, no rename:
 *
 *   live    https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/v1787567030/belgomla/products/6a84db…-0.webp
 *   mirror  https://cdn.jsdelivr.net/gh/samir102030/blgomla@images/files/belgomla/products/6a84db…-0.webp
 *
 * So the backup address is derivable from the live one with nothing to fetch,
 * nothing to cache and nothing to keep in sync — which matters, because the
 * one moment this code runs is the moment the network has already failed
 * once. A manifest lookup would need a request to the very kind of thing that
 * is not answering.
 *
 * The rules below have to match `pathFor` in `scripts/image-mirror/backup.mjs`.
 * They are deliberately the simplest rules that can work, so that staying
 * matched is easy.
 */

const CLOUDINARY_HOST = "res.cloudinary.com";

/** Change this if the mirror ever moves. Nothing else here is site-specific. */
export const MIRROR_ROOT = "https://cdn.jsdelivr.net/gh/samir102030/blgomla@images";

/*
  Cloudinary pictures live under `files/`, everything else under `external/`.
  Two prefixes rather than one because the mirror files them by two different
  rules — a public id, and a hash — and a single root would hide that.
*/
export const BACKUP_CDN = `${MIRROR_ROOT}/files`;

/*
  Everything between /upload/ and the public id is delivery instruction, not
  identity: `v1787567030` is a cache-busting version, and `f_auto,q_auto` or
  `c_limit,w_400` are the transforms cldImg injects when it asks for a
  particular size. The mirror holds one file per picture, at full size, under
  the id alone — so all of that comes off.
*/
const VERSION = /^v\d+$/;
const TRANSFORM = /^[a-z]{1,3}_[^/]+$/i;

/**
 * The public id inside a Cloudinary delivery URL, or null if this is not one.
 */
export const publicIdOf = (url: string): string | null => {
  if (!url || !url.includes(`${CLOUDINARY_HOST}/`)) return null;
  const at = url.indexOf("/upload/");
  if (at < 0) return null;

  // The retry in imageFallback appends ?r=1, and a fragment would confuse the
  // extension test below.
  const rest = url.slice(at + "/upload/".length).split("?")[0].split("#")[0];

  const segments = rest.split("/");
  while (segments.length > 1) {
    const head = segments[0];
    if (VERSION.test(head) || (TRANSFORM.test(head) && head.includes("_"))) {
      segments.shift();
      continue;
    }
    break;
  }
  const id = segments.join("/");
  return id || null;
};

/**
 * The mirror's address for a live Cloudinary URL, or null when there is no
 * mirrored copy to point at.
 *
 * Null for anything not on our Cloudinary — those are filed under a hash of
 * their address instead, and `externalBackupUrl` below works that one out.
 *
 * Null, too, for an id carrying no file extension. Cloudinary does not need
 * one; the mirror gives every file the extension its bytes turned out to
 * have, and guessing wrong would produce a second 404 in place of a
 * placeholder — slower, and no more useful.
 */
export const backupUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const id = publicIdOf(url);
  if (!id) return null;
  if (!/\.[a-z0-9]{2,5}$/i.test(id)) return null;
  return `${BACKUP_CDN}/${id}`;
};


/* ── pictures on somebody else's server ─────────────────────────────── */

/*
  A third of the catalogue is still hot-linked.

  4,000 products point at cdn.shopify.com and a handful at other hosts — an
  import that has not been through the image migration yet. Those have no
  public id to swap a prefix on, so the mirror files them under a hash of the
  address instead: `external/<first two hex>/<sha1><ext>`. The rules below have
  to match `pathFor` in scripts/image-mirror/backup.mjs exactly, the same way
  the Cloudinary rules above do.

  SHA-1 is what the mirror uses, so it is what this uses. It is not standing in
  for anything security depends on here — it names a file.

  Asynchronous, because the browser's only digest is. That is why this is a
  separate function rather than a branch inside `backupUrl`: the Cloudinary
  case is a string transform and stays one, and only the case that genuinely
  needs a promise pays for it.
*/

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "bmp",
  "svg",
]);

/** The extension the mirror filed it under, from the address alone. */
const extensionOf = (url: string): string => {
  const clean = url.split("?")[0].split("#")[0];
  const ext = (clean.split(".").pop() || "").toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return ".jpg";
  return `.${ext === "jpeg" ? "jpg" : ext}`;
};

const sha1Hex = async (text: string): Promise<string | null> => {
  // Absent on an insecure origin, and in a few older browsers. Without it
  // there is no address to compute, which is a placeholder — the same answer
  // as before this existed.
  if (!globalThis.crypto?.subtle) return null;
  try {
    const bytes = new TextEncoder().encode(text);
    const digest = await globalThis.crypto.subtle.digest("SHA-1", bytes);
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
};

/**
 * The mirror's address for a picture hosted somewhere that is not our
 * Cloudinary, or null when one cannot be worked out.
 */
export const externalBackupUrl = async (
  url: string | null | undefined
): Promise<string | null> => {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  if (url.includes(`${CLOUDINARY_HOST}/`)) return null;

  const digest = await sha1Hex(url);
  if (!digest) return null;
  return `${MIRROR_ROOT}/external/${digest.slice(0, 2)}/${digest}${extensionOf(url)}`;
};

export default backupUrl;
