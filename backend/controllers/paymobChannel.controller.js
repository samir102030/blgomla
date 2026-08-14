import PaymobChannel from "../models/paymobChannel.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";
import {
  encryptSecret,
  secretHint,
  isEncryptionConfigured,
} from "../utils/secretBox.js";

/**
 * Shape a channel for the admin UI. The encrypted key never leaves the server
 * — only a hint showing which key is stored, so an admin can tell two
 * merchant accounts apart without the value being readable from a screen or a
 * browser's network tab.
 */
const present = (doc) => ({
  _id: doc._id,
  label: doc.label,
  method: doc.method,
  integrationId: doc.integrationId,
  iframeId: doc.iframeId,
  hasOwnApiKey: Boolean(doc.apiKeyHint),
  apiKeyHint: doc.apiKeyHint || null,
  isActive: doc.isActive,
  notes: doc.notes,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const listChannels = controllerWrapper("listChannels", async (req, res) => {
  const channels = await PaymobChannel.find().sort({ method: 1, createdAt: -1 });
  res.status(200).json({
    success: true,
    channels: channels.map(present),
    // Surfaced so the UI can explain why saving a key is refused, rather than
    // the admin meeting an opaque error.
    encryptionReady: isEncryptionConfigured(),
  });
});

export const createChannel = controllerWrapper("createChannel", async (req, res) => {
  const { label, method, integrationId, iframeId, apiKey, notes, isActive } = req.body;

  const channel = new PaymobChannel({
    label,
    method: method || "card",
    integrationId,
    iframeId,
    notes,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  if (apiKey) {
    channel.apiKeyEnc = encryptSecret(apiKey);
    channel.apiKeyHint = secretHint(apiKey);
  }

  await channel.save();

  // Activating happens through the same path as the toggle so the
  // one-active-per-method rule lives in exactly one place.
  if (isActive) await activate(channel, req);

  logAudit(req, "payment.channel_created", "payment", channel._id, {
    label: channel.label,
    method: channel.method,
  }, { severity: "warning", category: "admin" });

  res.status(201).json({ success: true, channel: present(channel) });
});

/** Make one channel the live one for its method, standing the others down. */
const activate = async (channel, req) => {
  await PaymobChannel.updateMany(
    { method: channel.method, _id: { $ne: channel._id } },
    { $set: { isActive: false } }
  );
  channel.isActive = true;
  channel.updatedBy = req.user._id;
  await channel.save();
};

export const updateChannel = controllerWrapper("updateChannel", async (req, res) => {
  const { label, integrationId, iframeId, apiKey, notes } = req.body;
  const channel = await PaymobChannel.findById(req.params.id);
  if (!channel) {
    return res.status(404).json({ success: false, message: "Channel not found" });
  }

  if (label !== undefined) channel.label = label;
  if (integrationId !== undefined) channel.integrationId = integrationId;
  if (iframeId !== undefined) channel.iframeId = iframeId;
  if (notes !== undefined) channel.notes = notes;

  // An empty string means "clear the stored key and fall back to the
  // environment"; omitting the field entirely leaves it untouched, so editing
  // a label doesn't silently wipe a key nobody can re-read.
  if (apiKey !== undefined) {
    if (apiKey === "") {
      channel.apiKeyEnc = null;
      channel.apiKeyHint = null;
    } else {
      channel.apiKeyEnc = encryptSecret(apiKey);
      channel.apiKeyHint = secretHint(apiKey);
    }
  }

  channel.updatedBy = req.user._id;
  await channel.save();

  logAudit(req, "payment.channel_updated", "payment", channel._id, {
    label: channel.label,
  }, { severity: "warning", category: "admin" });

  res.status(200).json({ success: true, channel: present(channel) });
});

export const setChannelActive = controllerWrapper(
  "setChannelActive",
  async (req, res) => {
    const { isActive } = req.body;
    const channel = await PaymobChannel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" });
    }

    if (isActive) {
      await activate(channel, req);
    } else {
      channel.isActive = false;
      channel.updatedBy = req.user._id;
      await channel.save();
    }

    logAudit(req, "payment.channel_toggled", "payment", channel._id, {
      label: channel.label,
      method: channel.method,
      isActive: channel.isActive,
    }, { severity: "critical", category: "admin" });

    res.status(200).json({ success: true, channel: present(channel) });
  }
);

export const deleteChannel = controllerWrapper("deleteChannel", async (req, res) => {
  const channel = await PaymobChannel.findById(req.params.id);
  if (!channel) {
    return res.status(404).json({ success: false, message: "Channel not found" });
  }

  // Deleting the live channel would send checkout back to the environment
  // variables without anyone intending it. Make them stand it down first.
  if (channel.isActive) {
    return res.status(400).json({
      success: false,
      message: "Switch this channel off before deleting it, or activate another one first",
    });
  }

  await channel.deleteOne();

  logAudit(req, "payment.channel_deleted", "payment", req.params.id, {
    label: channel.label,
  }, { severity: "critical", category: "admin" });

  res.status(200).json({ success: true, message: "Channel deleted" });
});
