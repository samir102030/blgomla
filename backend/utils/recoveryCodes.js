import crypto from "crypto";

/**
 * Single-use codes that get someone back in when the authenticator app is
 * gone — phone lost, phone replaced, app reinstalled without the export.
 *
 * Without these, enabling TOTP on an account is a one-way door: the secret
 * lives in one app on one device, and if that device goes, the only way back
 * into the account is somebody editing the database by hand. That is a fine
 * risk for a customer who can wait, and not a fine one for the account that
 * runs the shop — which is exactly the account we most want on 2FA. So the
 * codes come first, and enforcement comes after.
 *
 * Ten of them, formatted `a1b2-c3d4`, which is short enough to write on paper
 * and unambiguous read back. Stored as sha256 hashes and never as plaintext,
 * so a database that leaks does not hand over ten working second factors —
 * the same treatment the password reset tokens already get.
 */

const CODE_COUNT = 10;
/** 4 bytes -> 8 hex characters, split by a dash. 2^32 per code. */
const CODE_BYTES = 4;

const hash = (code) =>
  crypto.createHash("sha256").update(normalize(code)).digest("hex");

/** Case and dashes are noise — someone reading off paper should not lose on either. */
export const normalize = (code) =>
  String(code ?? "").trim().toLowerCase().replace(/[\s-]/g, "");

const format = (hex) => `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;

/**
 * A fresh set. Returns the plaintext to show the user **once** and the
 * hashed records to store; the caller must never persist the former.
 */
export const generateRecoveryCodes = (count = CODE_COUNT) => {
  const plain = Array.from({ length: count }, () =>
    format(crypto.randomBytes(CODE_BYTES).toString("hex"))
  );
  return { plain, records: plain.map((code) => ({ codeHash: hash(code), usedAt: null })) };
};

/**
 * Spend one code.
 *
 * Returns the index of the code that matched, or -1. Comparison is
 * constant-time and every stored code is checked even after a match, so the
 * time taken does not reveal which position matched or whether any did.
 *
 * A code that has already been spent does not match again — that is the whole
 * point of them, and it is also what stops a leaked printout from being
 * replayed after the owner has used it.
 */
export const consumeRecoveryCode = (records, candidate) => {
  const normalized = normalize(candidate);
  // Reject obvious non-codes before hashing so a stray empty string cannot
  // match a malformed record.
  if (normalized.length !== CODE_BYTES * 2) return -1;
  const digest = crypto.createHash("sha256").update(normalized).digest();

  let match = -1;
  (records ?? []).forEach((record, index) => {
    if (!record?.codeHash || record.usedAt) return;
    const stored = Buffer.from(String(record.codeHash), "hex");
    if (stored.length !== digest.length) return;
    if (crypto.timingSafeEqual(stored, digest) && match === -1) match = index;
  });
  return match;
};

/** How many are still good, for the "you have N left" line in the dashboard. */
export const countUnusedRecoveryCodes = (records) =>
  (records ?? []).filter((r) => r && !r.usedAt).length;
