/**
 * imageCourier.mjs --from-cache, under a name a terminal cannot mangle.
 *
 *   node scripts/movepics.mjs
 *
 * Sends the pictures getpics.mjs already downloaded to the API, which files
 * them on Cloudinary. This is the only half of the image migration that needs
 * the dashboard login.
 *
 * ## Why the name
 *
 * Pasting into PowerShell on this machine drops capital letters: `cd
 * C:\Users\...` arrived as `cd :\sers\...`, and
 * `node scripts/imageCourier.mjs` arrived as `scripts/imageourier.mjs` — a
 * module-not-found for a file whose name is one character short, which reads
 * like the script is missing rather than like the paste was. Every character
 * here is lowercase, so there is nothing for a paste to eat.
 *
 * ## Why it sets the flag itself
 *
 * `--from-cache` is the whole point of this file, and it is also a word a
 * paste can damage. Running it without the flag would quietly do something
 * else entirely — download from the source hosts again, the slow thing this
 * exists to avoid — so the flag is not left to be typed. Anything else on the
 * command line is still passed through.
 */
import { argv } from "process";

if (!argv.includes("--from-cache")) argv.push("--from-cache");

await import("./imageCourier.mjs");
