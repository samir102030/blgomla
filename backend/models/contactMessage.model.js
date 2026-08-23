import mongoose from "mongoose";

/**
 * A message somebody sent from the contact page.
 *
 * The form had no destination. `handleSubmit` waited a moment, wrote the
 * fields to the browser console, showed "thanks, we'll be in touch", and threw
 * them away — no request, and no endpoint to receive one. Every enquiry since
 * the page went up is gone, and each of those customers is waiting for a reply
 * that was never going to come.
 *
 * Kept as its own collection rather than folded into quotations. A quotation is
 * a priced answer to a list of products and carries a workflow to match; an
 * enquiry is a person asking a question, and filing one as the other means an
 * operator reading a quotations page full of rows with no items and no total.
 */
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 40 },
    company: { type: String, trim: true, maxlength: 160 },
    subject: { type: String, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },

    /** Where on the site it was sent from, so a form added later is traceable. */
    source: { type: String, trim: true, default: "contact", maxlength: 60 },

    status: {
      type: String,
      enum: ["new", "read", "replied", "closed"],
      default: "new",
      index: true,
    },

    /** Filled in by whoever dealt with it, for the next person who reads it. */
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adminNotes: { type: String, trim: true, maxlength: 2000 },

    /** Set when the sender happened to be signed in. Most will not be. */
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// The inbox is read newest-first, and filtered by status far more often than
// by anything else.
contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ createdAt: -1 });

const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);
export default ContactMessage;
