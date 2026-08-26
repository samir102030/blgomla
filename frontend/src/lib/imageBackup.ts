/**
 * Where a picture's second copy lives.
 *
 * Every photograph the shop renders is mirrored into a separate repository,
 * `samir102030/blgomla-images`, by a job that runs on its own every Sunday.
 * jsDelivr serves that repository as a CDN for free, which is what turns the
 * mirror from a cold archive into something the site can actually fall back
 * to while a visitor is looking at it.
 *
 * ## Why this is a string transform and not a lookup
 *
 * The mirror files each picture under its Cloudinary public id, unchanged —
 * no hash, no shard, no rename:
 *
 *   live    https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/v1787567030/belgomla/products/6a84db…-0.webp
 *   mirror  https://cdn.jsdelivr.net/gh/samir102030/blgomla-images@main/files/belgomla/products/6a84db…-0.webp
 *
 * So the backup address is derivable from the live one with nothing to fetch,
 * nothing to cache and nothing to keep in sync — which matters, because the
 * one moment this code runs is the moment the network has already failed
 * once. A manifest lookup would need a request to the very kind of thing that
 * is not answering.
 *
 * The rules below have to match `pathFor` in the mirror's `scripts/backup.mjs`.
 * They are deliberately the simplest rules that can work, so that staying
 * matched is easy.
 */

const CLOUDINARY_HOST = "res.cloudinary.com";

/** Change this if the mirror ever moves. Nothing else here is site-specific. */
export const BACKUP_CDN =
  "https://cdn.jsdelivr.net/gh/samir102030/blgomla-images@main/files";

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
 * Null for anything not on our Cloudinary — a picture still hot-linked to a
 * vendor's site is mirrored under a hash of its address, which cannot be
 * derived here and is not worth a lookup for the hundred or so that remain.
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

export default backupUrl;
