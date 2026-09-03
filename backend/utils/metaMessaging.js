/**
 * Talking to Meta: proving a webhook came from them, and sending a reply back.
 *
 * Two platforms, two tokens, one shape. Messenger replies go through the Page
 * on graph.facebook.com; Instagram replies go through graph.instagram.com when
 * the account was connected with Instagram Login, and through the Page when it
 * was connected the older way. `META_IG_ACCESS_TOKEN` decides which — set it
 * and Instagram uses its own endpoint, leave it and Instagram borrows the
 * Page's, which is what a Page-linked professional account needs.
 */
import crypto from "crypto";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";

const PAGE_TOKEN = () => process.env.META_PAGE_ACCESS_TOKEN || "";
const IG_TOKEN = () => process.env.META_IG_ACCESS_TOKEN || "";
const APP_SECRET = () => process.env.META_APP_SECRET || "";

/** Configured enough to answer anyone at all. */
export const isConfigured = () => !!(PAGE_TOKEN() || IG_TOKEN());

/**
 * Is this really Meta?
 *
 * Meta signs the raw body with the app secret. The check has to run against
 * the bytes as they arrived — re-serialising the parsed JSON changes key order
 * and whitespace and the signature stops matching, which is the usual reason
 * this "mysteriously" fails.
 *
 * Returns false when no secret is configured. That is deliberate: an endpoint
 * that accepts unsigned traffic is an open relay to the shop's message API,
 * and failing closed costs a deployment note, not a customer.
 */
export const verifySignature = (rawBody, header) => {
  const secret = APP_SECRET();
  if (!secret || !rawBody || !header) return false;

  const [algorithm, signature] = String(header).split("=");
  if (algorithm !== "sha256" || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  // Both sides are hex of the same length, so this cannot throw on length.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const endpointFor = (platform) => {
  if (platform === "instagram" && IG_TOKEN()) {
    return {
      url: `https://graph.instagram.com/${GRAPH_VERSION}/me/messages`,
      token: IG_TOKEN(),
    };
  }
  return {
    url: `https://graph.facebook.com/${GRAPH_VERSION}/me/messages`,
    token: PAGE_TOKEN(),
  };
};

const post = async (platform, payload) => {
  const { url, token } = endpointFor(platform);
  if (!token) throw new Error(`no access token configured for ${platform}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`meta send ${response.status}: ${await response.text()}`);
  }
  return response.json();
};

/**
 * Meta rejects a message body over 1000 characters outright, so a long answer
 * has to be split rather than truncated — losing the end of a spec sheet is
 * worse than sending two bubbles. Split on paragraph, then sentence, then
 * hard, so the seam lands somewhere a reader would have paused anyway.
 */
const CHUNK = 950;

export const chunk = (text) => {
  const clean = String(text || "").trim();
  if (clean.length <= CHUNK) return clean ? [clean] : [];

  const out = [];
  let rest = clean;
  while (rest.length > CHUNK) {
    const window = rest.slice(0, CHUNK);
    const seam =
      Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf("\n")) > CHUNK * 0.4
        ? Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf("\n"))
        : Math.max(window.lastIndexOf(". "), window.lastIndexOf("، "), window.lastIndexOf("؟ ")) >
          CHUNK * 0.4
        ? Math.max(window.lastIndexOf(". "), window.lastIndexOf("، "), window.lastIndexOf("؟ ")) + 1
        : CHUNK;
    out.push(rest.slice(0, seam).trim());
    rest = rest.slice(seam).trim();
  }
  if (rest) out.push(rest);
  return out;
};

/** The three dots, so a two-second model call does not read as a dead page. */
export const sendTyping = async (platform, psid, on = true) => {
  try {
    await post(platform, {
      recipient: { id: psid },
      sender_action: on ? "typing_on" : "typing_off",
    });
  } catch (error) {
    // Cosmetic. Never let it stop the actual reply.
    console.error("meta typing indicator failed:", error.message);
  }
};

export const sendText = async (platform, psid, text) => {
  const parts = chunk(text);
  for (const part of parts) {
    await post(platform, {
      recipient: { id: psid },
      messaging_type: "RESPONSE",
      message: { text: part },
    });
  }
  return parts.length;
};

export default { verifySignature, sendText, sendTyping, isConfigured, chunk };
