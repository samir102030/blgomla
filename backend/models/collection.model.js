import mongoose from "mongoose";

const collectionItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    quantity: { type: Number, required: true, min: 1 },
    // Per-line price override, for quoting a component at something other than
    // its shelf price. `null` means "follow the product", so a catalogue price
    // change still flows into the quote; a number pins the line permanently.
    // Read it through lineUnitPrice() in utils/collectionPricing.js rather than
    // touching it directly — the null case has to be handled everywhere.
    unitPrice: { type: Number, min: 0, default: null },
  },
  { _id: false }
);

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, maxlength: 2000 },
    descriptionAr: { type: String, trim: true, maxlength: 2000, default: "" },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    items: { type: [collectionItemSchema], required: true },
    // Brands this quote covers. Derivable from the products, but kept as its
    // own field because the two answers differ on purpose: an operator can
    // list a brand the quote is built around before every one of its products
    // is picked, and can drop a brand from the header without deleting lines.
    brands: [{ type: mongoose.Schema.Types.ObjectId, ref: "Brand" }],
    bundlePrice: { type: Number, required: true, min: 0 },
    // Optional fitting service the customer opts into on the collection page.
    // `offered` is the operator's switch; `price` is what it adds per bundle.
    // Price 0 with offered true reads as "included" on the storefront rather
    // than as a free checkbox that does nothing.
    installation: {
      offered: { type: Boolean, default: false },
      price: { type: Number, min: 0, default: 0 },
      note: { type: String, trim: true, maxlength: 500, default: "" },
      noteAr: { type: String, trim: true, maxlength: 500, default: "" },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Collection = mongoose.model("Collection", collectionSchema);
export default Collection;
