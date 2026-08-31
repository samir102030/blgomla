/**
 * What a file actually is, read from its first bytes.
 *
 * The upload route used to decide from `file.mimetype`, which multer copies
 * out of the `Content-Type` the browser put on the multipart part. That value
 * is written by the client, so it is a claim rather than a fact: `curl` can
 * post a shell script and label it `image/png`, and every check downstream
 * believes it.
 *
 * Nothing catastrophic followed from that here, because Cloudinary decodes
 * and re-encodes whatever it is handed and refuses what it cannot decode. But
 * that is somebody else's guard doing our work, and it only holds for as long
 * as we keep sending everything through them.
 *
 * So: read the magic bytes, and let the claim be checked against them.
 */

/** Longest signature we look at, so callers know how much to keep. */
export const SIGNATURE_BYTES = 16;

const startsWith = (buf, bytes, offset = 0) =>
  bytes.every((b, i) => buf[offset + i] === b);

const ascii = (buf, offset, length) =>
  buf.slice(offset, offset + length).toString("latin1");

/**
 * ISO base media files (MP4, MOV, AVIF, HEIC) all begin with a size field and
 * then the literal `ftyp`; the four bytes after that name the flavour.
 */
const isoBrand = (buf) => (ascii(buf, 4, 4) === "ftyp" ? ascii(buf, 8, 4) : null);

const IMAGE_BRANDS = new Set(["avif", "avis", "heic", "heix", "heim", "heis", "mif1", "msf1"]);
const VIDEO_BRANDS = new Set([
  "isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "mp71",
  "avc1", "dash", "qt  ", "M4V ", "M4VP",
]);

/**
 * Identify a buffer. Returns `{ kind, format }` where kind is "image",
 * "video" or null, and format is a short label for the error message.
 *
 * Deliberately absent: SVG. It is an image everywhere else in the world and a
 * document that can carry `<script>` here, and nothing in this app uploads
 * one — every file input in the storefront and the dashboard is
 * `accept="image/*"` against a raster picture. Admitting it would mean
 * sanitising it, and not admitting it costs nothing.
 */
export const identifyUpload = (buf) => {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return { kind: null, format: null };

  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { kind: "image", format: "jpeg" };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { kind: "image", format: "png" };
  if (ascii(buf, 0, 4) === "GIF8") return { kind: "image", format: "gif" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP")
    return { kind: "image", format: "webp" };
  if (startsWith(buf, [0x42, 0x4d])) return { kind: "image", format: "bmp" };
  if (startsWith(buf, [0x49, 0x49, 0x2a, 0x00]) || startsWith(buf, [0x4d, 0x4d, 0x00, 0x2a]))
    return { kind: "image", format: "tiff" };
  if (startsWith(buf, [0x00, 0x00, 0x01, 0x00])) return { kind: "image", format: "ico" };

  const brand = isoBrand(buf);
  if (brand) {
    if (IMAGE_BRANDS.has(brand)) return { kind: "image", format: brand };
    if (VIDEO_BRANDS.has(brand)) return { kind: "video", format: brand };
    // An unrecognised ISO brand is still an ISO container. Treat it as video
    // rather than rejecting outright — the list above is not exhaustive and a
    // container we cannot name is not the same as a file pretending to be one.
    return { kind: "video", format: brand.trim() || "iso" };
  }

  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return { kind: "video", format: "webm" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "AVI ")
    return { kind: "video", format: "avi" };
  if (startsWith(buf, [0x46, 0x4c, 0x56, 0x01])) return { kind: "video", format: "flv" };

  return { kind: null, format: null };
};
