import mongoose from "mongoose";

/**
 * What prices were, immediately before a bulk raise moved them.
 *
 * A percentage is not reversible by arithmetic. Down 12% does not undo up 12%,
 * and rounding loses a little more each way — so the only honest undo is the
 * numbers themselves, written down before anything changes.
 *
 * Its own collection rather than a line in the audit log: the audit log answers
 * "who did what", and an array of a thousand old prices is not that. It is the
 * before-image of one operation, it is read by exactly one button, and it can
 * be dropped wholesale once it is old enough to be useless.
 */
const priceSnapshotSchema = new mongoose.Schema(
  {
    // The department this run was scoped to, kept by name as well because the
    // undo screen has to say what it is offering to undo.
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    categoryName: { type: String, trim: true },
    percent: { type: Number, required: true },
    entries: [
      {
        _id: false,
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        was: { type: Number, required: true },
        became: { type: Number, required: true },
      },
    ],
    // Who, so the screen can say "raised by X an hour ago" rather than making
    // an anonymous offer to change a thousand prices.
    byName: { type: String, trim: true },
    // Set when its undo has been used, so the same snapshot cannot be applied
    // twice and the screen stops offering it.
    undoneAt: { type: Date },
  },
  { timestamps: true }
);

// The screen only ever wants the newest one that has not been used.
priceSnapshotSchema.index({ createdAt: -1 });

const PriceSnapshot =
  mongoose.models.PriceSnapshot ||
  mongoose.model("PriceSnapshot", priceSnapshotSchema);

export default PriceSnapshot;
