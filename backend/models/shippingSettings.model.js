import mongoose from "mongoose";

// Singleton shipping config (key: "default"), editable from the admin dashboard.
// Replaces the old hardcoded shippingFee = 0. A clean seam for a future carrier
// API (e.g. Bosta): swap resolveShippingFee for a live-rate call.
const zoneSchema = new mongoose.Schema(
  {
    governorate: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shippingSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true, index: true },
    enabled: { type: Boolean, default: true },
    defaultFee: { type: Number, default: 0, min: 0 },
    // Orders at/above this subtotal ship free. 0 disables the threshold.
    freeShippingThreshold: { type: Number, default: 0, min: 0 },
    zones: { type: [zoneSchema], default: [] },
  },
  { timestamps: true }
);

const ShippingSettings = mongoose.model(
  "ShippingSettings",
  shippingSettingsSchema
);

export const getShippingSettings = async () => {
  let doc = await ShippingSettings.findOne({ key: "default" });
  if (!doc) doc = await ShippingSettings.create({ key: "default" });
  return doc;
};

export default ShippingSettings;
