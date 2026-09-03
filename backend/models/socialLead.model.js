import mongoose from "mongoose";

/**
 * An order taken in a chat, before it is an order.
 *
 * A real Order in this shop has a signed-in customer, a saved address, a
 * priced cart and a payment behind it. None of that exists yet when somebody
 * on Instagram says "عايز اتنين من دول، ابعتهملي المعادي". Writing that
 * straight into the orders collection would put a row with no payment and a
 * half-typed address into the same list the warehouse picks from — so it
 * lands here instead, and a person turns it into an order once they have
 * confirmed the stock and the price.
 *
 * The point of the row is that the sale does not evaporate when the shop
 * closes for the night. It is a lead with everything the assistant managed to
 * collect already on it.
 */

const lineSchema = new mongoose.Schema(
  {
    /** Free text as the customer said it, when nothing in the catalogue matched. */
    label: { type: String, trim: true, default: "" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    sku: { type: String, trim: true, default: "" },
    slug: { type: String, trim: true, default: "" },
    quantity: { type: Number, default: 1, min: 1 },
    /** What the assistant quoted, so a later argument has a number in it. */
    quotedPrice: { type: Number, min: 0, default: null },
  },
  { _id: false }
);

const socialLeadSchema = new mongoose.Schema(
  {
    thread: { type: mongoose.Schema.Types.ObjectId, ref: "SocialThread", index: true },
    channel: {
      type: String,
      enum: ["whatsapp", "instagram", "messenger", "tiktok"],
      required: true,
      index: true,
    },
    externalId: { type: String, required: true, trim: true },

    customerName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    governorate: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },

    items: { type: [lineSchema], default: [] },
    note: { type: String, trim: true, maxlength: 2000, default: "" },

    /** Indicative only — the assistant quotes list price, not the final bill. */
    estimatedTotal: { type: Number, min: 0, default: 0 },

    status: {
      type: String,
      enum: ["new", "contacted", "converted", "lost"],
      default: "new",
      index: true,
    },
    /** Set when a person turns this into a real order. */
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    internalNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

socialLeadSchema.index({ status: 1, createdAt: -1 });

const SocialLead = mongoose.model("SocialLead", socialLeadSchema);
export default SocialLead;
