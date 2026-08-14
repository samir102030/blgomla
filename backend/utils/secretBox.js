import crypto from "crypto";

/**
 * Authenticated encryption for secrets held in the database.
 *
 * AES-256-GCM: a fresh random IV per value, and an auth tag that makes
 * tampering fail loudly instead of decrypting to something else. Stored as
 * `v1:<iv>:<tag>:<ciphertext>`, all base64url, with the version prefix so the
 * algorithm can change later without guessing at old rows.
 *
 * The key lives in SECRET_ENCRYPTION_KEY — 32 bytes of hex, generated with
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * It belongs in the host's environment, never in the database it protects:
 * encrypting a value with a key stored beside it protects nothing.
 */

const VERSION = "v1";

const getKey = () => {
  const raw = process.env.SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw Object.assign(
      new Error(
        "SECRET_ENCRYPTION_KEY is not set — required before storing payment credentials"
      ),
      { status: 503 }
    );
  }
  const key = Buffer.from(raw.trim(), "hex");
  if (key.length !== 32) {
    throw Object.assign(
      new Error("SECRET_ENCRYPTION_KEY must be 32 bytes of hex (64 characters)"),
      { status: 503 }
    );
  }
  return key;
};

export const isEncryptionConfigured = () => {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
};

export const encryptSecret = (plaintext) => {
  if (plaintext == null || plaintext === "") return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
};

export const decryptSecret = (stored) => {
  if (!stored) return null;
  const [version, ivB64, tagB64, dataB64] = String(stored).split(":");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Stored secret is malformed");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};

/** Last four characters, for showing which secret is stored without revealing it. */
export const secretHint = (plaintext) => {
  const s = String(plaintext || "");
  return s.length <= 4 ? "••••" : `••••${s.slice(-4)}`;
};
