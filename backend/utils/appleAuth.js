import crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Verify a Sign in with Apple identity token.
 *
 * Apple returns a JWT signed with a rotating RSA key. Verifying it means
 * fetching Apple's public keys, picking the one named in the token header,
 * and checking the signature plus the issuer and audience — the same shape as
 * the Google flow next door, except google-auth-library does that work for us
 * and Apple ships no server SDK.
 *
 * No new dependency: Node's crypto has read JWK directly since v16, so a key
 * from Apple's endpoint converts to a verifier without a JWK-to-PEM library.
 *
 * A token that merely *parses* proves nothing. Everything below — signature,
 * issuer, audience, expiry — has to hold, or anyone could sign their own
 * token claiming to be any customer.
 */

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";

// Apple rotates these keys, so they can't be baked in, and they're stable for
// long enough that fetching per login would be pure latency. Cached for a day,
// with a forced refetch when a token names a key we haven't seen — which is
// exactly what a rotation looks like from here.
let keyCache = { keys: null, fetchedAt: 0 };
const KEY_TTL_MS = 24 * 60 * 60 * 1000;

const fetchAppleKeys = async (force = false) => {
  const fresh = Date.now() - keyCache.fetchedAt < KEY_TTL_MS;
  if (!force && keyCache.keys && fresh) return keyCache.keys;

  const res = await fetch(APPLE_KEYS_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Apple key endpoint returned ${res.status}`);

  const body = await res.json();
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("Apple key endpoint returned no keys");
  }
  keyCache = { keys: body.keys, fetchedAt: Date.now() };
  return keyCache.keys;
};

const publicKeyFor = async (kid) => {
  let keys = await fetchAppleKeys();
  let jwk = keys.find((k) => k.kid === kid);

  // Unknown kid means Apple rotated since we last looked.
  if (!jwk) {
    keys = await fetchAppleKeys(true);
    jwk = keys.find((k) => k.kid === kid);
  }
  if (!jwk) throw new Error("Apple signing key not found for this token");

  return crypto.createPublicKey({ key: jwk, format: "jwk" });
};

/** Every audience this deployment will accept a token for. */
const allowedAudiences = () =>
  [process.env.APPLE_CLIENT_ID, process.env.APPLE_BUNDLE_ID]
    .filter(Boolean)
    .flatMap((v) => v.split(",").map((s) => s.trim()))
    .filter(Boolean);

export const isAppleConfigured = () => allowedAudiences().length > 0;

/**
 * @returns {Promise<{ appleId: string, email?: string, emailVerified: boolean,
 *                     isPrivateEmail: boolean }>}
 */
export const verifyAppleIdentityToken = async (identityToken, { nonce } = {}) => {
  const audience = allowedAudiences();
  if (audience.length === 0) {
    throw Object.assign(new Error("Sign in with Apple is not configured on the server"), {
      status: 503,
    });
  }

  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded?.header?.kid) {
    throw Object.assign(new Error("Malformed Apple identity token"), { status: 401 });
  }

  const key = await publicKeyFor(decoded.header.kid);

  let payload;
  try {
    payload = jwt.verify(identityToken, key, {
      algorithms: ["RS256"],
      issuer: APPLE_ISSUER,
      audience,
    });
  } catch (err) {
    throw Object.assign(new Error("Invalid Apple identity token"), { status: 401 });
  }

  // The nonce ties this token to the sign-in attempt that started in the
  // user's browser; without checking it, a token captured elsewhere could be
  // replayed here. Only enforced when the client sent one.
  if (nonce) {
    const nonceHash = crypto.createHash("sha256").update(nonce).digest("hex");
    if (payload.nonce !== nonce && payload.nonce !== nonceHash) {
      throw Object.assign(new Error("Apple token nonce mismatch"), { status: 401 });
    }
  }

  if (!payload.sub) {
    throw Object.assign(new Error("Apple token carries no user identifier"), { status: 401 });
  }

  // Apple sends these as the strings "true"/"false" rather than booleans.
  const asBool = (v) => v === true || v === "true";

  return {
    appleId: payload.sub,
    email: payload.email,
    emailVerified: asBool(payload.email_verified),
    isPrivateEmail: asBool(payload.is_private_email),
  };
};
