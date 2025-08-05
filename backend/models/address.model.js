import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    zipCode: { type: String },
    isDefault: { type: Boolean, default: false },
    type: { type: String, enum: ["Billing", "Shipping"], default: "Shipping" },
  },
  { timestamps: true }
);

const Address = mongoose.model("Address", addressSchema);
export default Address;
