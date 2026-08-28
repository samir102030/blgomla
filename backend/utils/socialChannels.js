import crypto from "crypto";

/**
 * Everything that knows how to talk to a messaging platform lives here.
 *
 * Four channels, one shape. The rest of the code says `send(thread, text)`
 * and never learns that WhatsApp wants `messaging_product` in the body while
 * Messenger wants the token in the query string, or that Instagram cuts a
 * message off at a thousand characters and WhatsApp does not. Those are
 * facts about somebody else's API, and they belong in one file so that the
 * day one of them changes there is one place to change it.
 */

const GRAPH_VERSION = process.env.GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

/* ─────────────────────────────── configuration ─────────────────────────────── */

/**
 * Read at call time, not at import. The module is loaded once per warm Lambda
 * and `dotenv.config()` has not necessarily run when that happens.
 */
export const channelConfig = (channel) => {
  switch (channel) {
    case "whatsapp":
      return {
        id: process.env.WHATSAPP_PHONE_NUMBER_ID,
        token: process.env.WHATSAPP_TOKEN,
        // A WhatsApp text body is capped at 4096; leave room for the ellipsis.
        limit: 3900,
      };
    case "instagram":
      return {
        id: process.env.IG_ACCOUNT_ID,
        token: process.env.IG_TOKEN || process.env.FB_PAGE_TOKEN,
        // Instagram's own base host when the app uses Instagram Login rather
        // than Facebook Login. Both are Graph; only the hostname differs.
        base: process.env.IG_GRAPH_BASE
          ? `${process.env.IG_GRAPH_BASE}/${GRAPH_VERSION}`
          : GRAPH,
        limit: 950,
      };
    case "messenger":
      return {
        id: process.env.FB_PAGE_ID,
        token: process.env.FB_PAGE_TOKEN,
        limit: 1900,
      };
    case "tiktok":
      return {
        // TikTok has no public DM endpoint. What there is, is a Messaging
        // Partner holding the inbox on our behalf; we hand the reply back to
        // it and it delivers. See docs/social-ai-setup.md.
        relayUrl: process.env.TIKTOK_RELAY_URL,
        token: process.env.TIKTOK_RELAY_TOKEN,
        limit: 950,
      };
    default:
      return {};
  }
};

/** Is this channel wired up at all? Used to keep the health endpoint honest. */
export const channelReady = (channel) => {
  const c = channelConfig(channel);
  if (channel === "tiktok") return !!(c.relayUrl && c.token);
  return !!(c.id && c.token);
};

/* ─────────────────────────── webhook authenticity ─────────────────────────── */

/**
 * Meta signs every webhook body with the app secret. Without checking it, the
 * endpoint is a public URL that makes our assistant say whatever a stranger
 * posts to it — on our number, to our customers, and at our expense.
 *
 * The comparison is over raw bytes: `JSON.parse` then `JSON.stringify` does
 * not round-trip byte-for-byte, so the check has to run on the buffer Express
 * saw, which is why app.js keeps it on `req.rawBody`.
 */
export const verifyMetaSignature = (rawBody, header) => {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return false;
  if (!rawBody || !header) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(header));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/** The same idea for the TikTok relay, which signs with a shared secret. */
export const verifyRelaySignature = (rawBody, header) => {
  const secret = process.env.TIKTOK_RELAY_TOKEN;
  if (!secret || !rawBody || !header) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header).replace(/^sha256=/, ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/* ──────────────────────────────── sending ──────────────────────────────── */

/**
 * Break a reply into pieces the platform will actually accept.
 *
 * Split on blank lines first, then on sentence ends, and only cut mid-word as
 * a last resort — a customer should never see a price cut in half.
 */
export const chunk = (text, limit) => {
  const clean = String(text || "").trim();
  if (!clean) return [];
  if (clean.length <= limit) return [clean];

  const out = [];
  let buffer = "";

  const flush = () => {
    if (buffer.trim()) out.push(buffer.trim());
    buffer = "";
  };

  for (const piece of clean.split(/\n{2,}/)) {
    if ((buffer + "\n\n" + piece).trim().length <= limit) {
      buffer = buffer ? `${buffer}\n\n${piece}` : piece;
      continue;
    }
    flush();
    if (piece.length <= limit) {
      buffer = piece;
      continue;
    }
    // Still too long on its own: fall back to sentences, then to hard cuts.
    let rest = piece;
    while (rest.length > limit) {
      const window = rest.slice(0, limit);
      const cut = Math.max(
        window.lastIndexOf("\n"),
        window.lastIndexOf("۔"),
        window.lastIndexOf("."),
        window.lastIndexOf("؟"),
        window.lastIndexOf("?"),
        window.lastIndexOf("!")
      );
      const at = cut > limit * 0.5 ? cut + 1 : window.lastIndexOf(" ") > 0 ? window.lastIndexOf(" ") : limit;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    buffer = rest;
  }
  flush();

  return out.filter(Boolean);
};

const postJson = async (url, body, { bearer, timeoutMs = 15000 } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 400)}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timer);
  }
};

const sendOne = async (channel, to, text) => {
  const c = channelConfig(channel);

  switch (channel) {
    case "whatsapp":
      return postJson(
        `${GRAPH}/${c.id}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          // Link previews off: a product link with a preview card pushes the
          // price out of the first screen on a phone.
          text: { preview_url: false, body: text },
        },
        { bearer: c.token }
      );

    case "instagram":
      return postJson(
        `${c.base}/${c.id}/messages`,
        { recipient: { id: to }, message: { text } },
        { bearer: c.token }
      );

    case "messenger":
      return postJson(
        `${GRAPH}/${c.id}/messages`,
        {
          recipient: { id: to },
          // RESPONSE is the only type allowed to a person who wrote to us
          // inside the standard window, and it is the only thing we do.
          messaging_type: "RESPONSE",
          message: { text },
        },
        { bearer: c.token }
      );

    case "tiktok":
      return postJson(
        c.relayUrl,
        { channel: "tiktok", to, text },
        { bearer: c.token }
      );

    default:
      throw new Error(`unknown channel: ${channel}`);
  }
};

/**
 * Send a reply, in as many messages as the platform's ceiling requires.
 *
 * Sequential on purpose: fired in parallel they arrive out of order, and an
 * answer whose second half lands first reads as nonsense.
 */
export const send = async (channel, to, text) => {
  const { limit = 950 } = channelConfig(channel);
  const parts = chunk(text, limit);
  const results = [];
  for (const part of parts) {
    results.push(await sendOne(channel, to, part));
  }
  return results;
};

/**
 * Tell WhatsApp the message was read, so the customer sees two blue ticks
 * while the model is still thinking instead of wondering if we are there.
 * Best-effort — a failure here must never stop the actual reply.
 */
export const markRead = async (channel, messageId) => {
  if (channel !== "whatsapp" || !messageId) return;
  const c = channelConfig("whatsapp");
  try {
    await postJson(
      `${GRAPH}/${c.id}/messages`,
      { messaging_product: "whatsapp", status: "read", message_id: messageId },
      { bearer: c.token, timeoutMs: 5000 }
    );
  } catch (error) {
    console.warn("[social] mark-read failed:", error.message);
  }
};

/**
 * Keep working after the response has been sent.
 *
 * The webhook has to answer 200 immediately — Meta redelivers anything it
 * waited on — but the actual reply takes as long as the model takes. On a
 * normal server the promise simply keeps running; on Vercel the function is
 * frozen the moment the response is flushed unless something has told the
 * platform to wait, which is what the request context's `waitUntil` is for.
 * Reached through the well-known symbol rather than @vercel/functions so this
 * stays dependency-free and a local `npm start` behaves identically.
 */
export const runAfterResponse = (work) => {
  const promise = Promise.resolve()
    .then(work)
    .catch((error) => console.error("[social] background work failed:", error));

  const ctx = globalThis[Symbol.for("@vercel/request-context")]?.get?.();
  if (typeof ctx?.waitUntil === "function") ctx.waitUntil(promise);

  return promise;
};

export default { send, markRead, chunk, verifyMetaSignature, verifyRelaySignature, runAfterResponse, channelConfig, channelReady };
