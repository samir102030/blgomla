import connectDB from "../config/db.js";
import { handleInbound } from "../utils/socialInbox.js";
import {
  verifyMetaSignature,
  verifyRelaySignature,
  runAfterResponse,
  channelReady,
} from "../utils/socialChannels.js";

/**
 * The door the platforms knock on.
 *
 * Three rules run this file and they are all about time or trust.
 *
 * Trust: nothing is acted on before the signature checks out. This URL is
 * public by necessity, and an unsigned POST that reached `handleInbound`
 * would let a stranger make our assistant say things on our number.
 *
 * Time: Meta wants a 200 quickly and redelivers what it did not get one for.
 * A model call plus two tool round-trips does not fit in that budget, so the
 * 200 goes out first and the thinking happens after it — which on Vercel
 * means telling the platform to keep the function alive, hence
 * `runAfterResponse`.
 *
 * And order: one webhook can carry several messages from several people.
 * They are handled one at a time, because two replies to the same person
 * written concurrently race each other into the same thread document.
 */

/* ─────────────────────────────── verification ─────────────────────────────── */

/**
 * Meta calls this once, when the webhook is first saved in the app dashboard,
 * and expects the challenge echoed back as bare text.
 */
export const verify = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).type("text/plain").send(String(challenge));
  }
  console.warn("[social] webhook verification refused");
  return res.sendStatus(403);
};

/* ──────────────────────────────── parsing ──────────────────────────────── */

const textOf = (message) => {
  if (!message) return "";
  // WhatsApp
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;
  if (message.interactive?.button_reply?.title) return message.interactive.button_reply.title;
  if (message.interactive?.list_reply?.title) return message.interactive.list_reply.title;
  // Messenger / Instagram
  if (typeof message.text === "string") return message.text;
  return "";
};

const attachmentTypeOf = (message) => {
  if (!message) return "";
  if (message.type && message.type !== "text") return message.type;
  const first = message.attachments?.[0];
  if (first?.type) return first.type;
  return "";
};

/** WhatsApp: entry[].changes[].value */
const readWhatsApp = (body) => {
  const events = [];
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      // `statuses` is delivery/read receipts for messages we sent. Not a
      // message, and answering one would be a loop.
      if (!Array.isArray(value.messages)) continue;

      const accountId = value.metadata?.phone_number_id || "";
      const nameOf = (waId) =>
        (value.contacts || []).find((c) => c.wa_id === waId)?.profile?.name || "";

      for (const message of value.messages) {
        events.push({
          channel: "whatsapp",
          externalId: message.from,
          accountId,
          messageId: message.id,
          text: textOf(message),
          attachmentType: textOf(message) ? "" : attachmentTypeOf(message),
          displayName: nameOf(message.from),
          // On WhatsApp the id *is* the phone number, which is the one channel
          // where we can call the customer back without asking.
          phone: message.from,
        });
      }
    }
  }
  return events;
};

/** Instagram and Messenger: entry[].messaging[] */
const readMessaging = (body, channel) => {
  const events = [];
  for (const entry of body.entry || []) {
    const inbox = entry.messaging || entry.standby || [];
    for (const item of inbox) {
      const message = item.message;
      if (!message) continue;

      // Our own outgoing message, echoed back to us. Answering it is how a
      // bot ends up talking to itself in a customer's inbox.
      if (message.is_echo) continue;
      if (message.is_deleted) continue;

      const text = textOf(message);
      events.push({
        channel,
        externalId: item.sender?.id,
        accountId: item.recipient?.id || entry.id || "",
        messageId: message.mid,
        text,
        attachmentType: text ? "" : attachmentTypeOf(message),
      });
    }
  }
  return events;
};

const parseMeta = (body) => {
  switch (body?.object) {
    case "whatsapp_business_account":
      return readWhatsApp(body);
    case "instagram":
      return readMessaging(body, "instagram");
    case "page":
      return readMessaging(body, "messenger");
    default:
      return [];
  }
};

/* ─────────────────────────────── receiving ─────────────────────────────── */

const drain = async (events) => {
  await connectDB();
  for (const event of events) {
    if (!event.externalId) continue;
    try {
      await handleInbound(event);
    } catch (error) {
      // One bad conversation must not take the rest of the batch with it.
      console.error(
        `[social] ${event.channel}/${event.externalId} failed:`,
        error.message
      );
    }
  }
};

/**
 * WhatsApp, Instagram and Messenger all arrive here: one Meta app, one
 * webhook URL, three `object` values.
 */
export const receiveMeta = async (req, res) => {
  if (!verifyMetaSignature(req.rawBody, req.get("x-hub-signature-256"))) {
    console.warn("[social] rejected a webhook with a bad signature");
    return res.sendStatus(403);
  }

  const events = parseMeta(req.body);

  // Acknowledge first, always. Even an empty batch — a receipt-only webhook
  // left unacknowledged is redelivered for hours.
  res.sendStatus(200);

  if (events.length) runAfterResponse(() => drain(events));
};

/**
 * TikTok, through whichever Messaging Partner holds the inbox.
 *
 * TikTok publishes no direct-message endpoint an ordinary business can call,
 * so this is not Meta's shape and never will be. The partner posts us a flat
 * `{ userId, text, messageId }` and takes our reply back out through
 * TIKTOK_RELAY_URL. Keeping that contract this thin is the point: the day
 * TikTok opens the API, or the partner is swapped, this file is the only one
 * that changes.
 */
export const receiveTikTok = async (req, res) => {
  if (!verifyRelaySignature(req.rawBody, req.get("x-relay-signature"))) {
    console.warn("[social] rejected a TikTok relay call with a bad signature");
    return res.sendStatus(403);
  }

  const payload = req.body || {};
  const event = {
    channel: "tiktok",
    externalId: String(payload.userId || payload.sender_id || "").trim(),
    messageId: String(payload.messageId || payload.message_id || "").trim(),
    text: String(payload.text || payload.message || "").trim(),
    displayName: String(payload.displayName || payload.username || "").trim(),
  };

  res.sendStatus(200);

  if (event.externalId) runAfterResponse(() => drain([event]));
};

/**
 * Which channels are actually wired up. Read by the admin dashboard, and by
 * whoever is trying to work out why Instagram is quiet — it answers "the
 * token is missing" without anyone having to read the deploy's env vars.
 */
export const status = (req, res) => {
  res.json({
    success: true,
    model: !!process.env.ANTHROPIC_API_KEY,
    signing: !!process.env.META_APP_SECRET,
    channels: {
      whatsapp: channelReady("whatsapp"),
      instagram: channelReady("instagram"),
      messenger: channelReady("messenger"),
      tiktok: channelReady("tiktok"),
    },
  });
};

export default { verify, receiveMeta, receiveTikTok, status };
