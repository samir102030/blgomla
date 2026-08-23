import ContactMessage from "../models/contactMessage.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";
import { sendContactEnquiryEmail } from "../utils/email.js";

/**
 * The contact page's messages: taking them, reading them, closing them.
 *
 * Storing and notifying are deliberately separate. The store is what makes the
 * message survive; the email is a convenience that can fail — a mail provider
 * having a bad afternoon must not turn a customer's enquiry into an error page
 * and a lost message. So the write is awaited and the mail is not allowed to
 * throw past it.
 */

const clean = (value, max) => String(value ?? "").trim().slice(0, max);

/** Anyone can send one. Deliberately not behind a login: the point of a contact
 *  page is the person who does not have an account yet. */
export const submitContactMessage = controllerWrapper(
  "submitContactMessage",
  async (req, res) => {
    const name = clean(req.body?.name, 120);
    const email = clean(req.body?.email, 200).toLowerCase();
    const message = clean(req.body?.message, 5000);

    const missing = [];
    if (!name) missing.push("name");
    if (!email) missing.push("email");
    if (!message) missing.push("message");
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Please fill in: ${missing.join(", ")}.`,
        fields: missing,
      });
    }
    // Deliberately loose. A stricter pattern rejects real addresses more often
    // than it catches fake ones, and the cost of a bad address here is one
    // unanswerable message rather than anything worse.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "That email address does not look right.", fields: ["email"] });
    }

    const saved = await ContactMessage.create({
      name,
      email,
      phone: clean(req.body?.phone, 40),
      company: clean(req.body?.company, 160),
      subject: clean(req.body?.subject, 200),
      message,
      source: clean(req.body?.source, 60) || "contact",
      user: req.user?._id || null,
    });

    // Never awaited into the response path: see the note at the top.
    sendContactEnquiryEmail(saved).catch((error) =>
      console.error("[contact] stored but could not notify:", error?.message || error)
    );

    res.status(201).json({
      success: true,
      message: "Thanks — we have your message and will get back to you.",
      id: saved._id,
    });
  }
);

/** The inbox. */
export const listContactMessages = controllerWrapper(
  "listContactMessages",
  async (req, res) => {
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query?.limit) || 25, 1), 100);
    const filter = {};
    if (["new", "read", "replied", "closed"].includes(req.query?.status)) {
      filter.status = req.query.status;
    }

    const [messages, total, unread] = await Promise.all([
      ContactMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("handledBy", "name")
        .lean(),
      ContactMessage.countDocuments(filter),
      ContactMessage.countDocuments({ status: "new" }),
    ]);

    res.status(200).json({
      success: true,
      messages,
      total,
      unread,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
    });
  }
);

/** Marking one dealt with, and saying what was done about it. */
export const updateContactMessage = controllerWrapper(
  "updateContactMessage",
  async (req, res) => {
    const update = {};
    if (["new", "read", "replied", "closed"].includes(req.body?.status)) {
      update.status = req.body.status;
      update.handledBy = req.user?._id || null;
    }
    if (typeof req.body?.adminNotes === "string") {
      update.adminNotes = clean(req.body.adminNotes, 2000);
    }
    if (!Object.keys(update).length) {
      return res.status(400).json({ success: false, message: "Nothing to change." });
    }

    const saved = await ContactMessage.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).populate("handledBy", "name");
    if (!saved) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    await logAudit(req, "contact.message.update", "contactMessage", String(saved._id), update);
    res.status(200).json({ success: true, message: saved });
  }
);
