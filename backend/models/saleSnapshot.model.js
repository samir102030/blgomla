import mongoose from "mongoose";

/**
 * What the discounts were, immediately before a cap pulled them down.
 *
 * The same reason prices get a before-image: a cap is not reversible by
 * arithmetic. Everything above the line lands exactly on the line, so 90%, 60%
 * and 14% all become 13% and the original spread is gone. Nothing in the row
 * remembers it. The only honest undo is the numbers themselves, written down
 * before anything moves.
 *
 * Its own collection rather than a line in the audit log, for the same reason
 * as PriceSnapshot: the audit log answers "who did what", and an array of eight
 * hundred old percentages is not that. It is the before-image of one operation,
 * read by exactly one button, and droppable wholesale once it is old enough to
 * be useless.
 */
const saleSnapshotSchema = new mongoose.Schema(
  {
    // The ceiling this run applied. Kept because the undo screen has to say
    // what it is offering to undo, and because two runs at different caps are
    // not interchangeable.
    cap: { type: Number, required: true },
    entries: [
      {
        _id: false,
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        // Only what it was: what it became is the cap, the same for every row.
        was: { type: Number, required: true },
      },
    ],
    // Who, so the screen can say "capped by X an hour ago" rather than making
    // an anonymous offer to change eight hundred discounts.
    byName: { type: String, trim: true },
    // Set when its undo has been used, so the same snapshot cannot be applied
    // twice and the screen stops offering it.
    undoneAt: { type: Date },
  },
  { timestamps: true }
);

// The screen only ever wants the newest one that has not been used.
saleSnapshotSchema.index({ createdAt: -1 });

const SaleSnapshot =
  mongoose.models.SaleSnapshot || mongoose.model("SaleSnapshot", saleSnapshotSchema);

export default SaleSnapshot;
