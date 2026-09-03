/**
 * Messenger and Instagram, answered by the same assistant the storefront uses.
 *
 * Meta posts every message to one endpoint. What arrives is not all messages —
 * it is also delivery receipts, read receipts, reactions, and echoes of what
 * the shop itself just sent — so most of the work here is deciding what to
 * ignore. What is left goes to `supportBrain`, which is the only thing in the
 * codebase allowed to state a price or a stock level, and the answer goes back
 * out through the Graph API.
 *
 * The one rule that matters more than the answer: when a person from the shop
 * replies in the Meta inbox, the bot stops. A customer being answered twice,
 * once by a colleague and once by software that did not notice, is the failure
 * mode that makes people turn these things off.
 */
import SocialThread from "../models/socialThread.model.js";
import { answer } from "../utils/supportBrain.js";
import { sendText, sendTyping, verifySignature, isConfigured } from "../utils/metaMessaging.js";

/** How long the bot stays out of the way after a human replies. */
const HUMAN_TAKEOVER_MS = 12 * 60 * 60 * 1000;

/** How long it waits after promising to fetch someone. */
const HANDOFF_PAUSE_MS = 2 * 60 * 60 * 1000;

const WHATSAPP = (process.env.SUPPORT_WHATSAPP || "201125210210").replace(/\D/g, "");
const STOREFRONT = process.env.CLIENT_URL?.split(",")[0]?.trim() || "https://blgomla.vercel.app";

/*
  "Get me a person."

  `supportBrain` has its own, wider list of these, but it only acts on it when
  no model key is configured — with Claude answering, the brain always reports
  `handoff: false` and the decision has to be made here. Narrower than the
  brain's on purpose: on a shop's Instagram, "عندكم واتساب؟" is a question
  about a contact number, not a request to be escalated, and treating it as one
  would hand off half the inbox.
*/
const HUMAN_REQUEST = [
  "عايز اكلم حد", "عاوز اكلم حد", "محتاج اكلم حد", "اكلم حد", "حد يكلمني",
  "حد من الفريق", "موظف", "خدمة العملاء", "خدمه العملاء", "بني ادم",
  "عايز حد يرد", "مش عايز بوت", "انت بوت",
  "talk to a human", "speak to a human", "real person", "customer service",
  "customer support", "an agent", "a representative", "not a bot",
];

/** Arabic differs by keyboard, not by meaning: fold what varies. */
const fold = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const asksForHuman = (text) => {
  const t = fold(text);
  return HUMAN_REQUEST.some((phrase) => t.includes(fold(phrase)));
};

/** Arabic script anywhere in the message means answer in Arabic. */
const langOf = (text) => (/[؀-ۿ]/.test(String(text)) ? "ar" : "en");

const say = (lang, ar, en) => (lang === "ar" ? ar : en);

/* ──────────────────────────── the verification GET ──────────────────────────── */

/**
 * Meta calls this once when the webhook URL is saved, and again whenever it is
 * edited. It wants the challenge echoed back as bare text — a JSON body, or
 * anything but 200, and the subscription silently never activates.
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const expected = process.env.META_VERIFY_TOKEN;
  if (!expected) {
    console.error("meta webhook: META_VERIFY_TOKEN is not set");
    return res.sendStatus(500);
  }

  if (mode === "subscribe" && token === expected) {
    return res.status(200).type("text/plain").send(String(challenge ?? ""));
  }
  return res.sendStatus(403);
};

/* ─────────────────────────────── the message POST ─────────────────────────────── */

const platformOf = (object) => (object === "instagram" ? "instagram" : "messenger");

const loadThread = async (platform, psid) => {
  const existing = await SocialThread.findOne({ platform, psid });
  if (existing) return existing;
  return SocialThread.create({ platform, psid, history: [], seenMids: [] });
};

/**
 * An echo is the shop's own outbound message coming back.
 *
 * If our app sent it, it is our own reply and there is nothing to do. If
 * anything else sent it, a person opened the inbox and typed — so the bot
 * steps back for the rest of the working day.
 */
const handleEcho = async (platform, event) => {
  const psid = event.recipient?.id;
  if (!psid) return;

  const ours = String(event.message?.app_id || "") === String(process.env.META_APP_ID || "");
  if (ours) return;

  await SocialThread.updateOne(
    { platform, psid },
    {
      $set: {
        pausedUntil: new Date(Date.now() + HUMAN_TAKEOVER_MS),
        awaitingHuman: false,
        lastMessageAt: new Date(),
      },
      $setOnInsert: { platform, psid },
    },
    { upsert: true }
  );
};

/**
 * The text of the message, whatever shape it came in.
 *
 * Quick-reply taps and postbacks carry their label rather than free text, and
 * reading it is what lets a menu button and a typed sentence go down the same
 * path. Attachments carry nothing we can read at all.
 */
const textOf = (event) => {
  const direct = event.message?.text;
  if (direct) return String(direct).trim();

  const quickReply = event.message?.quick_reply?.payload;
  if (quickReply) return String(quickReply).trim();

  const postback = event.postback?.title || event.postback?.payload;
  if (postback) return String(postback).trim();

  return "";
};

const handoffText = (lang) =>
  say(
    lang,
    `هبعتلك حد من الفريق حالاً. لو مستعجل كلّمنا واتساب: https://wa.me/${WHATSAPP}`,
    `Someone from the team will pick this up shortly. If it is urgent, WhatsApp us: https://wa.me/${WHATSAPP}`
  );

const attachmentReply = (lang) =>
  say(
    lang,
    `وصلتني، بس أنا بقرأ الكلام المكتوب بس. اكتبلي اسم المنتج أو السؤال وأنا أساعدك — أو اتفرج على الكتالوج هنا: ${STOREFRONT}`,
    `Got it, but I can only read text. Type the product name or your question and I will help — or browse the catalogue here: ${STOREFRONT}`
  );

const handleMessage = async (platform, event) => {
  const psid = event.sender?.id;
  const mid = event.message?.mid || event.postback?.mid;
  if (!psid) return;

  const thread = await loadThread(platform, psid);

  // A person from the shop is on this conversation. Stay out of it.
  if (thread.pausedUntil && thread.pausedUntil > new Date()) return;

  // Meta retries; a retry mid-flight looks exactly like a new message.
  if (mid && thread.seenMids?.includes(mid)) return;
  if (mid) {
    thread.seenMids = [...(thread.seenMids || []), mid].slice(-20);
    await thread.save();
  }

  const text = textOf(event);
  const lang = langOf(text || "");

  if (!text) {
    // A photo, a sticker, a voice note. Say so rather than going quiet.
    if (event.message?.attachments?.length) {
      await sendText(platform, psid, attachmentReply(lang));
    }
    return;
  }

  await sendTyping(platform, psid, true);

  const history = (thread.history || []).slice(-8).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  let reply;
  let wantsHuman = asksForHuman(text);

  try {
    // No `user`: a Messenger PSID is not an account, so the order tools will
    // correctly refuse and the assistant will say so instead of guessing.
    const result = await answer({ text, user: null, history, lang });
    reply = result?.text;
    wantsHuman = wantsHuman || !!result?.handoff;
  } catch (error) {
    console.error("social assistant failed:", error.message);
  }

  if (!reply) {
    reply = say(
      lang,
      "معلش، حصلت مشكلة عندي دلوقتي. جرب تبعت تاني، أو كلمنا واتساب: https://wa.me/" + WHATSAPP,
      "Sorry — something went wrong on my side. Try again, or WhatsApp us: https://wa.me/" + WHATSAPP
    );
  }

  const outgoing = wantsHuman ? `${reply}\n\n${handoffText(lang)}` : reply;

  await sendText(platform, psid, outgoing);
  await sendTyping(platform, psid, false);

  thread.history = [
    ...(thread.history || []),
    { role: "user", content: text.slice(0, 2000), at: new Date() },
    { role: "assistant", content: outgoing.slice(0, 2000), at: new Date() },
  ].slice(-16);
  thread.lastMessageAt = new Date();
  if (wantsHuman) {
    thread.awaitingHuman = true;
    // Promised a person; do not keep chatting over them while they arrive.
    thread.pausedUntil = new Date(Date.now() + HANDOFF_PAUSE_MS);
  }
  await thread.save();
};

/**
 * Meta wants a 200 fast. It gets one after the work is done rather than
 * before, because on a serverless host a response ends the invocation and
 * anything still in flight is killed — an early 200 here would mean replies
 * that sometimes silently never send. The dedupe above makes the retry that
 * a slow request may earn us harmless.
 */
export const receiveWebhook = async (req, res) => {
  if (!verifySignature(req.rawBody, req.get("x-hub-signature-256"))) {
    return res.sendStatus(403);
  }

  const body = req.body || {};
  if (body.object !== "page" && body.object !== "instagram") {
    return res.sendStatus(404);
  }

  if (!isConfigured()) {
    console.error("meta webhook: no access token configured, cannot reply");
    return res.sendStatus(200);
  }

  const platform = platformOf(body.object);

  try {
    for (const entry of body.entry || []) {
      const events = entry.messaging || entry.standby || [];
      for (const event of events) {
        if (event.message?.is_echo) {
          await handleEcho(platform, event);
          continue;
        }
        if (event.read || event.delivery || event.reaction) continue;
        if (!event.message && !event.postback) continue;

        await handleMessage(platform, event);
      }
    }
  } catch (error) {
    // Meta retries a non-200, and a retry of a message we already answered is
    // caught by the dedupe. But an error here is ours, not theirs, and asking
    // them to hammer the endpoint over it helps nobody.
    console.error("meta webhook processing failed:", error);
  }

  return res.sendStatus(200);
};

export default { verifyWebhook, receiveWebhook };
