import Message from "../models/message.model.js";
import { answer } from "../utils/supportBrain.js";
import { getOrCreateGeneralConversation } from "../utils/supportConversation.js";

/** E.164 without the "+", the way wa.me wants it. */
const WHATSAPP_NUMBER = (process.env.SUPPORT_WHATSAPP || "201009353639").replace(/\D/g, "");

/** wa.me refuses very long links, and nobody reads a wall of text anyway. */
const TRANSCRIPT_LIMIT = 1200;

const asLang = (value) => (String(value).toLowerCase().startsWith("ar") ? "ar" : "en");

/**
 * Ask the assistant something.
 *
 * Open to visitors as well as customers: most of what people ask before they
 * buy — is this in stock, what does shipping cost, can I return it — has no
 * account behind it, and putting a sign-in wall in front of those questions
 * loses the sale the assistant exists to save. What does need an account is
 * refused inside the tools, not here.
 */
export const ask = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: "message is too long" });
    }

    const lang = asLang(req.body?.lang || "ar");
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];

    const result = await answer({ text: message, user: req.user || null, history, lang });

    return res.json({
      success: true,
      reply: result.text,
      suggestions: result.suggestions || [],
      handoff: !!result.handoff,
      source: result.source || "rules",
      signedIn: !!req.user,
    });
  } catch (error) {
    console.error("support assistant ask failed:", error);
    return res.status(500).json({ success: false, message: "assistant unavailable" });
  }
};

/**
 * Hand the conversation to a person.
 *
 * The point of the hand-off is that the customer does not start again. What
 * they already said goes with them: into the WhatsApp draft they land on, and
 * — when there is an account to file it against — into the same support thread
 * the team already reads in the dashboard, so whichever channel someone picks
 * it up on, the other one has it too.
 */
export const handoff = async (req, res) => {
  try {
    const lang = asLang(req.body?.lang || "ar");
    const turns = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

    const who = req.user?.name || (lang === "ar" ? "زائر" : "Visitor");
    const header =
      lang === "ar"
        ? `مرحباً، أنا ${who}. كنت بتكلم مع المساعد على الموقع ومحتاج حد من الفريق.`
        : `Hello, this is ${who}. I was talking to the assistant on the site and need someone from the team.`;

    const body = turns
      .map((turn) => {
        const speaker =
          turn.role === "assistant"
            ? lang === "ar"
              ? "المساعد"
              : "Assistant"
            : lang === "ar"
            ? "أنا"
            : "Me";
        return `${speaker}: ${String(turn.content || "").replace(/\s+/g, " ").trim()}`;
      })
      .filter((line) => line.length > 4)
      .join("\n");

    let transcript = `${header}\n\n${body}`.trim();
    if (transcript.length > TRANSCRIPT_LIMIT) {
      transcript = `${transcript.slice(0, TRANSCRIPT_LIMIT - 1)}…`;
    }

    let filed = false;
    if (req.user) {
      const conversation = await getOrCreateGeneralConversation(req.user._id);
      const note = await Message.create({
        conversation: conversation._id,
        sender: req.user._id,
        content: transcript,
      });
      conversation.lastMessage = note._id;
      conversation.lastMessageAt = note.createdAt;
      await conversation.save();
      filed = true;
    }

    return res.json({
      success: true,
      whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(transcript)}`,
      filed,
    });
  } catch (error) {
    console.error("support assistant handoff failed:", error);
    return res.status(500).json({ success: false, message: "handoff failed" });
  }
};

export default { ask, handoff };
