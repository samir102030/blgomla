import ShippingSettings, {
  getShippingSettings,
} from "../models/shippingSettings.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";

// GET /api/shipping — public; the checkout reads this to show the fee.
export const getShipping = controllerWrapper("getShipping", async (req, res) => {
  const settings = await getShippingSettings();
  res.status(200).json({ success: true, settings });
});

// PUT /api/shipping — admin only.
export const updateShipping = controllerWrapper(
  "updateShipping",
  async (req, res) => {
    const {
      enabled,
      defaultFee,
      freeShippingThreshold,
      deliveryDaysMin,
      deliveryDaysMax,
      zones,
    } = req.body;
    const update = {};
    if (enabled !== undefined) update.enabled = !!enabled;
    if (defaultFee !== undefined)
      update.defaultFee = Math.max(0, Number(defaultFee) || 0);
    if (freeShippingThreshold !== undefined)
      update.freeShippingThreshold = Math.max(0, Number(freeShippingThreshold) || 0);
    if (deliveryDaysMin !== undefined)
      update.deliveryDaysMin = Math.max(0, Number(deliveryDaysMin) || 0);
    if (deliveryDaysMax !== undefined)
      update.deliveryDaysMax = Math.max(0, Number(deliveryDaysMax) || 0);
    if (Array.isArray(zones)) {
      update.zones = zones
        .filter((z) => z && z.governorate && Number.isFinite(Number(z.fee)))
        .map((z) => ({
          governorate: String(z.governorate).trim(),
          fee: Math.max(0, Number(z.fee)),
          deliveryDaysMin:
            z.deliveryDaysMin === null || z.deliveryDaysMin === undefined
              ? null
              : Math.max(0, Number(z.deliveryDaysMin)),
          deliveryDaysMax:
            z.deliveryDaysMax === null || z.deliveryDaysMax === undefined
              ? null
              : Math.max(0, Number(z.deliveryDaysMax)),
        }));
    }
    const settings = await ShippingSettings.findOneAndUpdate(
      { key: "default" },
      { $set: update },
      { new: true, upsert: true }
    );
    logAudit(req, "shipping.updated", "shipping", null, { defaultFee: settings.defaultFee, freeShippingThreshold: settings.freeShippingThreshold, enabled: settings.enabled });
    res.status(200).json({ success: true, settings });
  }
);
