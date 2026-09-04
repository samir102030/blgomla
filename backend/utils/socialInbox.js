import SocialThread from "../models/socialThread.model.js";
import SocialLead from "../models/socialLead.model.js";
import { answer } from "./supportBrain.js";
import { send, markRead } from "./socialChannels.js";

/**
 * What happens between a message arriving and a reply going out.
 *
 * The brain is already written — `supportBrain.answer()` is the same one the
 * website assistant uses, reading the same catalogue and the same shipping
 * table. Nothing here re-implements it. What is here is everything that is
 * true of a chat on a phone and not of a chat box on a page: the same person
 * comes back tomorrow, the platform will redeliver a message we already
 * answered, a human sometimes has to take the conversation away from the
 * assistant, and an order gets taken down in the middle of it.
 */

const CHANNEL_LABEL = {
  whatsapp: "واتساب",
  instagram: "إنستجرام",
  messenger: "ماسنجر",
  tiktok: "تيك توك",
};

/** Arabic script anywhere in the sentence means answer in Arabic. */
const detectLang = (text) => (/[؀-ۿ]/.test(String(text || "")) ? "ar" : "en");

/**
 * How long a hand-off holds the assistant back before it starts helping again.
 * Long enough that nobody is talked over while the team is picking the
 * conversation up; short enough that a customer nobody reached is not left in
 * silence indefinitely.
 */
const HANDOFF_HOLD_MS = 2 * 60 * 60 * 1000;

/**
 * A person is taking this conversation, so the assistant is not to speak on it.
 *
 * The hold used to be permanent, and the reasoning was sound — a bot talking
 * over a colleague mid-handover is worse than no bot. What it missed is that
 * nothing here ever hears the colleague arrive: echoes of the Page's own
 * outgoing messages are dropped in the webhook controller, so a reply typed in
 * the Meta inbox never reaches a thread. The mark could be set and never
 * cleared, and a conversation that nobody picked up stayed silent for good.
 *
 * Two hours is the compromise. Inside it the assistant stays out of the way.
 * Past it, with still no sign of anyone, answering the customer beats leaving
 * them talking to a wall — and the team has the notification either way.
 * `closed` is a decision someone made on purpose and does not lapse.
 */
const botShouldStayQuiet = (thread) => {
  if (thread.status === "closed") return true;
  if (thread.status !== "human") return false;
  if (!thread.handoffAt) return true;
  return Date.now() - new Date(thread.handoffAt).getTime() < HANDOFF_HOLD_MS;
};

/* ────────────────────────── tools that only exist here ────────────────────────── */

/**
 * Taking an order down.
 *
 * Deliberately not an Order. A row in the orders collection is something the
 * warehouse picks and the accounts reconcile; what a chat produces is an
 * intention with a half-confirmed address. It lands in `SocialLead` and a
 * person promotes it. The tool refuses an empty basket so a model that got
 * excited cannot file a lead with nothing in it.
 */
const captureOrderTool = (thread, notify) => ({
  spec: {
    name: "capture_order",
    description:
      "Record what the customer wants to order so a member of the team can confirm stock and price and call them back. " +
      "Only call this after the customer has named at least one product AND given a phone number or address. " +
      "Do not promise a delivery date — say a colleague will confirm.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "What they asked for, one entry per product.",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Product name as the customer said it." },
              sku: { type: "string" },
              slug: { type: "string", description: "From search_products, when a catalogue row matched." },
              quantity: { type: "number" },
              quotedPrice: { type: "number", description: "The price you quoted them, if you quoted one." },
            },
            required: ["label"],
          },
        },
        customerName: { type: "string" },
        phone: { type: "string" },
        governorate: { type: "string" },
        address: { type: "string" },
        note: { type: "string", description: "Anything else that matters — colour, timing, a request." },
      },
      required: ["items"],
    },
  },
  run: async (input) => {
    const items = Array.isArray(input.items) ? input.items.filter((i) => i?.label) : [];
    if (!items.length) {
      return { saved: false, reason: "no items — ask the customer what they want first" };
    }

    const phone = String(input.phone || thread.phone || "").trim();
    if (!phone && !String(input.address || "").trim()) {
      return { saved: false, reason: "no phone and no address — ask for one before recording the order" };
    }

    const lines = items.slice(0, 20).map((i) => ({
      label: String(i.label).slice(0, 200),
      sku: String(i.sku || "").slice(0, 60),
      slug: String(i.slug || "").slice(0, 200),
      quantity: Math.max(1, Math.min(Number(i.quantity) || 1, 9999)),
      quotedPrice: Number.isFinite(Number(i.quotedPrice)) ? Number(i.quotedPrice) : null,
    }));

    const estimatedTotal = lines.reduce(
      (sum, l) => sum + (l.quotedPrice ? l.quotedPrice * l.quantity : 0),
      0
    );

    const lead = await SocialLead.create({
      thread: thread._id,
      channel: thread.channel,
      externalId: thread.externalId,
      customerName: String(input.customerName || thread.displayName || "").slice(0, 120),
      phone: phone.slice(0, 40),
      governorate: String(input.governorate || "").slice(0, 80),
      address: String(input.address || "").slice(0, 500),
      items: lines,
      note: String(input.note || "").slice(0, 2000),
      estimatedTotal: Math.round(estimatedTotal * 100) / 100,
    });

    if (phone && !thread.phone) thread.phone = phone.slice(0, 40);

    await notify(
      `طلب جديد من ${CHANNEL_LABEL[thread.channel] || thread.channel}`,
      [
        lead.customerName || thread.displayName || thread.externalId,
        phone && `تليفون: ${phone}`,
        lines.map((l) => `• ${l.label} ×${l.quantity}`).join("\n"),
        input.address && `العنوان: ${input.address}`,
        estimatedTotal > 0 && `تقديري: ${estimatedTotal} جنيه`,
      ]
        .filter(Boolean)
        .join("\n")
    );

    return {
      saved: true,
      reference: String(lead._id).slice(-8).toUpperCase(),
      // Said plainly so the model does not turn it into a confirmed order.
      note: "Recorded as a request, not a confirmed order. Tell the customer a colleague will confirm stock and the final price shortly.",
    };
  },
});

/**
 * Fetching a person.
 *
 * The model decides, because the model is the one reading the sentence — a
 * customer who is angry, or asking about something the tools cannot see, or
 * simply asking for a human, all end up here and none of them is a keyword.
 */
const requestHumanTool = (thread, notify) => ({
  spec: {
    name: "request_human",
    description:
      "Hand this conversation to a person on the team. Call this when the customer asks for a human, " +
      "when they are upset, when it is a complaint or a warranty claim, or when the tools cannot answer " +
      "and guessing would be worse than waiting. After calling it, tell the customer a colleague is coming.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "One line, for the team's inbox." },
      },
      required: ["reason"],
    },
  },
  run: async (input) => {
    thread.status = "human";
    thread.handoffReason = String(input.reason || "").slice(0, 500);
    thread.handoffAt = new Date();

    await notify(
      `محادثة محتاجة حد — ${CHANNEL_LABEL[thread.channel] || thread.channel}`,
      [
        thread.displayName || thread.externalId,
        thread.phone && `تليفون: ${thread.phone}`,
        thread.handoffReason,
      ]
        .filter(Boolean)
        .join("\n")
    );

    return { ok: true, note: "A colleague has been alerted. Tell the customer someone will reply here shortly." };
  },
});

/* ─────────────────────────────── telling the team ─────────────────────────────── */

/**
 * Best-effort, and deliberately so: a lead is saved whether or not the alert
 * gets through, and an alerting failure must never become the customer's
 * problem. Two routes, because the two fail differently — a WhatsApp message
 * reaches somebody who is not at a desk, a notification survives being missed.
 */
const notifyTeam = async (title, body) => {
  const text = `🔔 ${title}\n\n${body}`;

  const alertNumber = (process.env.SOCIAL_ALERT_WHATSAPP || "").replace(/\D/g, "");
  if (alertNumber) {
    try {
      await send("whatsapp", alertNumber, text);
    } catch (error) {
      console.error("[social] team WhatsApp alert failed:", error.message);
    }
  }

  try {
    const [{ default: Notification }, { default: User }] = await Promise.all([
      import("../models/notification.model.js"),
      import("../models/user.model.js"),
    ]);
    const admins = await User.find({ role: { $in: ["admin", "super_admin"] } })
      .select("_id")
      .limit(10)
      .lean();
    if (admins.length) {
      await Notification.insertMany(
        admins.map((a) => ({
          user: a._id,
          title,
          message: body.slice(0, 1000),
          type: "info",
          link: "/admin/social-inbox",
        }))
      );
    }
  } catch (error) {
    console.error("[social] team notification failed:", error.message);
  }
};

/* ──────────────────────────────── the main path ──────────────────────────────── */

const SYSTEM_EXTRA = [
  "You are answering inside a private chat on a messaging app, not on the website.",
  "Write like a person typing on a phone: two or three short lines, no headings, no bullet points, no markdown.",
  "When you name a product, paste the `url` the search tool returned on its own line — never invent a link.",
  "You cannot see this customer's orders unless they are signed in on the site, and here nobody is. If they ask about an order, ask for the order reference and hand them to a person.",
  "Prices you quote are list prices; shipping is quoted from the shipping tool and nothing else.",
  "If they send a voice note, a photo or a file, say you cannot open it here and ask them to type it.",
].join(" ");

/**
 * @param {object} event
 * @param {"whatsapp"|"instagram"|"messenger"|"tiktok"} event.channel
 * @param {string} event.externalId  who wrote to us, in that platform's ids
 * @param {string} [event.accountId] which of our numbers/pages it arrived on
 * @param {string} [event.messageId] the platform's id, for de-duplication
 * @param {string} [event.text]      the message, when it is text at all
 * @param {string} [event.displayName]
 * @param {string} [event.phone]
 * @param {string} [event.attachmentType] set when it was a photo/voice/file
 */
export const handleInbound = async (event) => {
  const { channel, externalId, messageId } = event;
  if (!channel || !externalId) return { skipped: "malformed event" };

  /**
   * Upsert rather than find-then-create. Two messages sent a second apart
   * arrive as two concurrent invocations, and find-then-create races them
   * into a duplicate-key error on exactly the busiest conversations.
   */
  const thread = await SocialThread.findOneAndUpdate(
    { channel, externalId },
    {
      $setOnInsert: { channel, externalId },
      $set: {
        ...(event.accountId ? { accountId: event.accountId } : {}),
        ...(event.displayName ? { displayName: event.displayName } : {}),
        ...(event.phone ? { phone: event.phone } : {}),
        lastInboundAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Redelivery. Meta retries anything it did not get a 200 for in time, and
  // answering twice is worse than answering late.
  if (messageId && thread.seenMessageIds.includes(messageId)) {
    return { skipped: "duplicate" };
  }
  if (messageId) thread.seenMessageIds.push(messageId);

  // A conversation a person closed reopens on the next message, as a bot one.
  if (thread.status === "closed") thread.status = "bot";

  markRead(channel, messageId).catch(() => {});

  const text = String(event.text || "").trim();

  /**
   * Voice notes are how half of Egypt writes a message, and we cannot read
   * one. Saying so immediately — and fetching a person — is better than
   * silence, which the customer reads as being ignored.
   */
  if (!text) {
    thread.history.push({
      role: "user",
      content: `[${event.attachmentType || "attachment"}]`,
    });
    thread.messageCount += 1;

    if (!botShouldStayQuiet(thread)) {
      const reply =
        "وصلتني رسالتك بس مش قادر أفتحها هنا 🙏 ممكن تكتبلي اللي محتاجه؟ ولو تحب، حد من الفريق هيرد عليك حالاً.";
      await send(channel, externalId, reply);
      thread.history.push({ role: "assistant", content: reply });
      thread.lastOutboundAt = new Date();
      thread.status = "human";
      thread.handoffReason = "attachment the assistant cannot read";
      thread.handoffAt = new Date();
      await notifyTeam(
        `مرفق مش مقروء — ${CHANNEL_LABEL[channel] || channel}`,
        `${thread.displayName || externalId} بعت ${event.attachmentType || "مرفق"}.`
      );
    }

    await thread.save();
    return { handled: true, kind: "attachment" };
  }

  thread.history.push({ role: "user", content: text.slice(0, 4000) });
  thread.messageCount += 1;
  thread.lang = detectLang(text);

  // A person owns this one. Record what was said so they see it, say nothing.
  if (botShouldStayQuiet(thread)) {
    await thread.save();
    return { handled: true, kind: "silent-human-owned" };
  }

  const beforeStatus = thread.status;

  const result = await answer({
    text,
    // Nobody on a social channel is authenticated. Passing null is what makes
    // the order tools refuse rather than leak — see supportTools.
    user: null,
    history: thread.brainHistory(10),
    lang: thread.lang,
    extraTools: [captureOrderTool(thread, notifyTeam), requestHumanTool(thread, notifyTeam)],
    systemExtra: SYSTEM_EXTRA,
  });

  let reply = String(result.text || "").trim();

  /**
   * The rules engine sets `handoff` without having a tool to call. Honour it
   * the same way, so a customer who asked for a human gets one whether the
   * model or the fallback answered them.
   */
  if (result.handoff && thread.status !== "human") {
    thread.status = "human";
    thread.handoffReason = thread.handoffReason || "assistant asked for a person";
    thread.handoffAt = new Date();
    if (beforeStatus !== "human") {
      await notifyTeam(
        `محادثة محتاجة حد — ${CHANNEL_LABEL[channel] || channel}`,
        `${thread.displayName || externalId}\n${text.slice(0, 300)}`
      );
    }
  }

  if (!reply) {
    reply =
      thread.lang === "ar"
        ? "ثانية واحدة، هوصّلك بحد من الفريق يرد عليك."
        : "One moment — I am passing you to someone from the team.";
    thread.status = "human";
  }

  await send(channel, externalId, reply);

  thread.history.push({ role: "assistant", content: reply.slice(0, 4000) });
  thread.lastOutboundAt = new Date();
  await thread.save();

  return { handled: true, kind: "replied", status: thread.status };
};

export default { handleInbound };
