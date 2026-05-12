import mongoose from "mongoose";

const quotationItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number }, // price at time of quotation
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    // Reference to the collection this quotation is for
    bundleCollection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
    },
    // Customer info
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      company: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    // Items (from collection or custom)
    items: { type: [quotationItemSchema], required: true },
    // Quantities requested
    collectionQuantity: { type: Number, default: 1, min: 1 },
    // Pricing
    estimatedTotal: { type: Number },
    finalTotal: { type: Number },
    // Status workflow
    status: {
      type: String,
      enum: ["pending", "reviewed", "quoted", "accepted", "rejected", "expired"],
      default: "pending",
    },
    // Admin notes / response
    adminNotes: { type: String, trim: true },
    customerNotes: { type: String, trim: true },
    // Validity
    validUntil: { type: Date },
    // Linked user (optional, if logged in)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ "customer.email": 1 });

const Quotation = mongoose.model("Quotation", quotationSchema);
export default Quotation;
