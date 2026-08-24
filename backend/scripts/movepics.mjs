/**
 * imageCourier.mjs, under a name a terminal cannot mangle.
 *
 *   node scripts/movepics.mjs --from-cache
 *
 * Not a second implementation — it runs the real one. The only thing it
 * changes is the spelling.
 *
 * Pasting into PowerShell on this machine drops capital letters: `cd
 * C:\Users\...` arrived as `cd :\sers\...`, and
 * `node scripts/imageCourier.mjs` arrived as `scripts/imageourier.mjs`, which
 * is a module-not-found for a file whose name is one character short. Every
 * character in this filename is lowercase, and so is every flag it takes, so
 * there is nothing left for the paste to eat.
 *
 * getpics.mjs is the same idea for the downloader.
 */
import "./imageCourier.mjs";
