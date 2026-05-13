import mongoose from "mongoose";

const collectionItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    quantity: { type: Number, required: true, min: 1 },
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
    bundlePrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Collection = mongoose.model("Collection", collectionSchema);
export default Collection;
