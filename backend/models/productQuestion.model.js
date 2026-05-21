import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    // True when the answer came from the product's store owner or an admin.
    isOfficial: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const productQuestionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    answers: [answerSchema],
    // Moderation flag — hidden questions are excluded from the public list.
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productQuestionSchema.index({ product: 1, createdAt: -1 });

const ProductQuestion = mongoose.model("ProductQuestion", productQuestionSchema);
export default ProductQuestion;
