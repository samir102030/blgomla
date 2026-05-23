import mongoose from "mongoose";

// Singleton config (key: "default") for the Accurate (accuratess.com) shipping
// carrier integration, editable from the admin dashboard. Mirrors the
// shippingSettings pattern. The API itself is gated behind ACCURATE_USERNAME /
// ACCURATE_PASSWORD env vars (see utils/accurate.js); this model holds the
// per-account routing data that env vars can't express.
//
// The crux of the integration: Accurate addresses destinations by numeric
// zoneId + subzoneId, but our Address model only stores free-text city/state.
// `mappings` bridges that gap — each entry maps a governorate (matched against
// the address) to the Accurate zone/subzone IDs. Build it from the live
// dropdowns (listZonesDropdown) via the admin endpoints.
const mappingSchema = new mongoose.Schema(
  {
    governorate: { type: String, required: true, trim: true },
    zoneId: { type: Number, required: true },
    subzoneId: { type: Number, required: true },
  },
  { _id: false }
);

const accurateSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true, index: true },
    enabled: { type: Boolean, default: false },

    // Default shipping service used for fee calc + shipment creation.
    serviceId: { type: Number },

    // Pickup / sender details applied to every shipment.
    senderName: { type: String, trim: true },
    senderPhone: { type: String, trim: true },
    senderMobile: { type: String, trim: true },
    senderAddress: { type: String, trim: true },
    senderZoneId: { type: Number },
    senderSubzoneId: { type: Number },

    // Shipment defaults. typeCode FDP = forward delivery (deliver to recipient);
    // priceTypeCode INCLD/EXCLD = whether the declared price already includes
    // shipping. defaultWeight (kg) is used because orders don't track weight.
    typeCode: {
      type: String,
      enum: ["FDP", "PDP", "PTP", "RTS", "CLC"],
      default: "FDP",
    },
    priceTypeCode: {
      type: String,
      enum: ["EXCLD", "INCLD"],
      default: "INCLD",
    },
    defaultWeight: { type: Number, default: 1, min: 0 },

    mappings: { type: [mappingSchema], default: [] },
  },
  { timestamps: true }
);

const AccurateSettings = mongoose.model(
  "AccurateSettings",
  accurateSettingsSchema
);

export const getAccurateSettings = async () => {
  let doc = await AccurateSettings.findOne({ key: "default" });
  if (!doc) doc = await AccurateSettings.create({ key: "default" });
  return doc;
};

export default AccurateSettings;
