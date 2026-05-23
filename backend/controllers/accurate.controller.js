import AccurateSettings, {
  getAccurateSettings,
} from "../models/accurateSettings.model.js";
import Order from "../models/order.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import {
  isAccurateEnabled,
  createAccurateShipment,
  getAccurateShipmentStatus,
  listAccurateZones,
  listAccurateServices,
} from "../utils/accurate.js";

// GET /api/accurate/settings — admin. Reports config + whether credentials are
// present (credentials themselves live in env, never in the response).
export const getSettings = controllerWrapper("getAccurateSettings", async (req, res) => {
  const settings = await getAccurateSettings();
  res.status(200).json({
    success: true,
    settings,
    credentialsConfigured: isAccurateEnabled(),
  });
});

// PUT /api/accurate/settings — admin.
export const updateSettings = controllerWrapper(
  "updateAccurateSettings",
  async (req, res) => {
    const {
      enabled,
      serviceId,
      senderName,
      senderPhone,
      senderMobile,
      senderAddress,
      senderZoneId,
      senderSubzoneId,
      typeCode,
      priceTypeCode,
      defaultWeight,
      mappings,
    } = req.body;

    const update = {};
    if (enabled !== undefined) update.enabled = !!enabled;
    if (serviceId !== undefined)
      update.serviceId = serviceId === null ? undefined : Number(serviceId);
    if (senderName !== undefined) update.senderName = String(senderName).trim();
    if (senderPhone !== undefined) update.senderPhone = String(senderPhone).trim();
    if (senderMobile !== undefined)
      update.senderMobile = String(senderMobile).trim();
    if (senderAddress !== undefined)
      update.senderAddress = String(senderAddress).trim();
    if (senderZoneId !== undefined)
      update.senderZoneId = senderZoneId === null ? undefined : Number(senderZoneId);
    if (senderSubzoneId !== undefined)
      update.senderSubzoneId =
        senderSubzoneId === null ? undefined : Number(senderSubzoneId);
    if (typeCode !== undefined) update.typeCode = typeCode;
    if (priceTypeCode !== undefined) update.priceTypeCode = priceTypeCode;
    if (defaultWeight !== undefined)
      update.defaultWeight = Math.max(0, Number(defaultWeight) || 0);

    if (Array.isArray(mappings)) {
      update.mappings = mappings
        .filter(
          (m) =>
            m &&
            m.governorate &&
            Number.isFinite(Number(m.zoneId)) &&
            Number.isFinite(Number(m.subzoneId))
        )
        .map((m) => ({
          governorate: String(m.governorate).trim(),
          zoneId: Number(m.zoneId),
          subzoneId: Number(m.subzoneId),
        }));
    }

    const settings = await AccurateSettings.findOneAndUpdate(
      { key: "default" },
      { $set: update },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, settings });
  }
);

// GET /api/accurate/zones?parentId= — admin. Top-level zones, or subzones of a
// given parent. Used to build the governorate -> zone/subzone map.
export const listZones = controllerWrapper("listAccurateZones", async (req, res) => {
  if (!isAccurateEnabled()) {
    return res
      .status(400)
      .json({ success: false, message: "Accurate credentials are not configured" });
  }
  try {
    const zones = await listAccurateZones(req.query.parentId ?? null);
    res.status(200).json({ success: true, zones });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
});

// GET /api/accurate/services — admin.
export const listServices = controllerWrapper(
  "listAccurateServices",
  async (req, res) => {
    if (!isAccurateEnabled()) {
      return res
        .status(400)
        .json({ success: false, message: "Accurate credentials are not configured" });
    }
    try {
      const services = await listAccurateServices();
      res.status(200).json({ success: true, services });
    } catch (err) {
      res.status(502).json({ success: false, message: err.message });
    }
  }
);

// POST /api/accurate/orders/:id/shipment — staff. Create a waybill for an order
// and persist the tracking info onto the order.
export const createShipment = controllerWrapper(
  "createAccurateShipment",
  async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate("shippingAddress")
      .populate("user");
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (order.shipment?.code || order.trackingNumber) {
      return res.status(400).json({
        success: false,
        message: "Order already has a shipment",
        trackingNumber: order.shipment?.code || order.trackingNumber,
      });
    }

    try {
      const shipment = await createAccurateShipment({
        order,
        address: order.shippingAddress,
        customer: order.user,
      });

      order.trackingNumber = shipment.code;
      if (shipment.trackingUrl) order.trackingUrl = shipment.trackingUrl;
      order.shipment = {
        provider: "accurate",
        id: shipment.id,
        code: shipment.code,
        status: shipment.status,
        syncedAt: new Date(),
      };
      await order.save();

      res.status(201).json({ success: true, shipment, order });
    } catch (err) {
      console.error("[Accurate] create shipment failed:", err.message);
      res.status(502).json({ success: false, message: err.message });
    }
  }
);

// GET /api/accurate/orders/:id/tracking — staff. Pull latest carrier status and
// store it on the order. Does not auto-change the order's own status (carrier
// status codes are account-specific); returns the live snapshot for display.
export const refreshTracking = controllerWrapper(
  "refreshAccurateTracking",
  async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    const id = order.shipment?.id ?? null;
    const code = order.shipment?.code || order.trackingNumber || null;
    if (id == null && !code) {
      return res
        .status(400)
        .json({ success: false, message: "Order has no Accurate shipment to track" });
    }

    const status = await getAccurateShipmentStatus({ id, code });
    if (!status) {
      return res
        .status(502)
        .json({ success: false, message: "Could not fetch tracking from Accurate" });
    }

    order.shipment = {
      ...(order.shipment?.toObject?.() || order.shipment || {}),
      provider: "accurate",
      id: status.id ?? id,
      code: status.code || code,
      status: status.status,
      syncedAt: new Date(),
    };
    if (status.trackingUrl) order.trackingUrl = status.trackingUrl;
    await order.save();

    res.status(200).json({ success: true, tracking: status, order });
  }
);
