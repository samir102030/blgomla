import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { uploadLimiter } from "../middleware/rateLimit.middleware.js";
import { identifyUpload } from "../utils/fileSignature.js";
import SocialThread from "../models/socialThread.model.js";
import { activateMember, inviteMember, listMembers, requireInboxOwner, loginInbox, logoutInbox, rejectForeignInboxWrites, requireInboxSession } from "../middleware/socialInboxAuth.js";
import { channelConfig, channelReady, send, sendImage } from "../utils/socialChannels.js";

const router = express.Router();
const channels = ["whatsapp", "messenger", "instagram"];
const replyWindowMs = 24 * 60 * 60 * 1000;
const replyMaxLength = 950;
const pageSize = 30;
const summaryFields = "channel accountId displayName phone status handoffReason manualHandoff lastInboundAt lastOutboundAt lastAgentEmail updatedAt";

router.use((_req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
});
router.use(rejectForeignInboxWrites);
router.post("/login", loginInbox);
router.post("/activate", activateMember);
router.use(requireInboxSession);
router.get("/session", (req, res) => res.json({ email: req.inboxEmail, role: req.inboxRole }));
router.post("/logout", logoutInbox);
router.get("/members", requireInboxOwner, listMembers);
router.post("/members", requireInboxOwner, inviteMember);

const threadFilter = (id) => ({ _id: id, channel: { $in: channels } });

const replyAvailable = (thread) => {
  const config = channelConfig(thread.channel);
  return Boolean(config.id && config.token && config.id === thread.accountId);
};

const summary = (thread) => ({
  id: String(thread._id),
  channel: thread.channel,
  name: thread.displayName || thread.phone || "Customer",
  phone: thread.phone,
  status: thread.status,
  handoffReason: thread.status === "human" && !thread.manualHandoff ? thread.handoffReason : undefined,
  manualHandoff: Boolean(thread.manualHandoff),
  updatedAt: thread.updatedAt,
  lastAgentEmail: thread.lastAgentEmail,
  replyUntil: thread.lastInboundAt
    ? new Date(new Date(thread.lastInboundAt).getTime() + replyWindowMs)
    : null,
  channelConnected: replyAvailable(thread),
});

const detail = (thread) => ({
  ...summary(thread),
  messages: thread.history.map(({ role, content, at, agentEmail }) => ({ role, content, at, agentEmail })),
});

const handle = (action) => async (req, res, next) => {
  try {
    if (req.params.id && !/^[a-f0-9]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ code: "INVALID_THREAD" });
    }
    await action(req, res);
  } catch (error) {
    next(error);
  }
};

router.get("/", handle(async (req, res) => {
  const channel = req.query.channel;
  const page = Number(req.query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 500 || (channel && !channels.includes(channel))) {
    return res.status(400).json({ code: "INVALID_FILTER" });
  }

  const filter = { channel: channel || { $in: channels } };
  if (req.query.eligible === "true") {
    if (!channel) return res.status(400).json({ code: "INVALID_FILTER" });
    const config = channelConfig(channel);
    if (!config.id || !config.token) return res.json({ items: [], hasNext: false });
    filter.accountId = config.id;
    filter.lastInboundAt = { $gt: new Date(Date.now() - replyWindowMs) };
  }
  const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    filter.$or = [{ displayName: pattern }, { phone: pattern }];
  }

  const rows = await SocialThread.find(filter)
    .select(summaryFields).sort({ updatedAt: -1, _id: -1 })
    .skip((page - 1) * pageSize).limit(pageSize + 1).lean();
  res.json({ items: rows.slice(0, pageSize).map(summary), hasNext: rows.length > pageSize });
}));

router.get("/overview", handle(async (_req, res) => {
  const today = new Date();
  const since = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const rows = await SocialThread.aggregate([
    { $match: { channel: { $in: channels } } },
    { $group: {
      _id: "$channel",
      total: { $sum: 1 },
      team: { $sum: { $cond: [{ $eq: ["$status", "human"] }, 1, 0] } },
      assistant: { $sum: { $cond: [{ $eq: ["$status", "bot"] }, 1, 0] } },
      waiting: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$lastInboundAt", new Date(0)] }, { $ifNull: ["$lastOutboundAt", new Date(0)] }] }, 1, 0] } },
      recent: { $sum: { $cond: [{ $gte: ["$lastInboundAt", since] }, 1, 0] } },
    } },
  ]);
  const byChannel = new Map(rows.map((row) => [row._id, row]));
  res.json({ channels: channels.map((channel) => {
    const row = byChannel.get(channel);
    return {
      channel, connected: channelReady(channel),
      total: row?.total ?? 0, team: row?.team ?? 0,
      assistant: row?.assistant ?? 0, recent: row?.recent ?? 0, waiting: row?.waiting ?? 0,
    };
  }) });
}));

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 0 },
}).single("image");

router.post("/images", uploadLimiter, (req, res, next) => {
  imageUpload(req, res, (error) => {
    if (error) return res.status(400).json({ code: "INVALID_IMAGE" });
    next();
  });
}, handle(async (req, res) => {
  if (!["jpeg", "png"].includes(identifyUpload(req.file?.buffer).format)) {
    return res.status(400).json({ code: "INVALID_IMAGE" });
  }
  const url = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "belgomla-inbox", allowed_formats: ["jpg", "png"] },
      (error, result) => error ? reject(error) : resolve(result.secure_url)
    ).end(req.file.buffer);
  });
  res.status(201).json({ url });
}));

router.get("/:id", handle(async (req, res) => {
  const thread = await SocialThread.findOne(threadFilter(req.params.id))
    .select(summaryFields + " history").lean();
  if (!thread) return res.status(404).json({ code: "THREAD_NOT_FOUND" });
  res.json(detail(thread));
}));

router.patch("/:id/assignment", handle(async (req, res) => {
  const assignment = req.body?.assignment;
  if (assignment !== "bot" && assignment !== "team") {
    return res.status(400).json({ code: "INVALID_ASSIGNMENT" });
  }
  const team = assignment === "team";
  const thread = await SocialThread.findOneAndUpdate(
    { ...threadFilter(req.params.id), "manualReply.id": { $exists: false } },
    team
      ? { $set: { status: "human", manualHandoff: true, handoffAt: new Date(), handoffReason: "Assigned from the inbox" } }
      : { $set: { status: "bot", manualHandoff: false }, $unset: { handoffAt: "", handoffReason: "" } },
    { new: true }
  ).select(summaryFields).lean();
  if (!thread) return res.status(409).json({ code: "THREAD_UNAVAILABLE" });
  res.json(summary(thread));
}));

router.post("/:id/replies", handle(async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const requestId = req.body?.requestId;
  const imageUrl = typeof req.body?.imageUrl === "string" ? req.body.imageUrl.trim() : "";
  let image;
  try { if (imageUrl) image = new URL(imageUrl); } catch { /* Reject malformed links below. */ }
  if ((Boolean(text) === Boolean(imageUrl)) || text.length > replyMaxLength ||
      (imageUrl && (imageUrl.length > 2000 || image?.protocol !== "https:" || image.username || image.password)) ||
      typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId)) {
    return res.status(400).json({ code: "INVALID_REPLY" });
  }

  const filter = threadFilter(req.params.id);
  const thread = await SocialThread.findOne(filter).lean();
  if (!thread) return res.status(404).json({ code: "THREAD_NOT_FOUND" });
  if (thread.history.some((turn) => turn.requestId === requestId)) return res.json({ accepted: true });
  if (!replyAvailable(thread)) return res.status(409).json({ code: "CHANNEL_UNAVAILABLE" });
  const cutoff = new Date(Date.now() - replyWindowMs);
  if (!thread.lastInboundAt || new Date(thread.lastInboundAt) <= cutoff) {
    return res.status(409).json({ code: "REPLY_WINDOW_CLOSED" });
  }

  const keepAssignment = req.body?.campaign === true;
  const claimed = await SocialThread.findOneAndUpdate(
    { ...filter, "manualReply.id": { $exists: false }, "history.requestId": { $ne: requestId }, lastInboundAt: { $gt: cutoff } },
    { $set: {
      manualReply: { id: requestId },
      ...(!keepAssignment && { status: "human", manualHandoff: true, handoffAt: new Date(), handoffReason: "Assigned from the inbox" }),
    } },
    { new: true }
  ).lean();
  if (!claimed) return res.status(409).json({ code: "THREAD_UNAVAILABLE" });

  const claimedFilter = { ...filter, "manualReply.id": requestId };
  let sent;
  try {
    sent = image
      ? [await sendImage(claimed.channel, claimed.externalId, image.href)]
      : await send(claimed.channel, claimed.externalId, text);
  } catch {
    await SocialThread.updateOne(claimedFilter, { $unset: { manualReply: "" } });
    return res.status(502).json({ code: "REPLY_NOT_CONFIRMED" });
  }

  const accepted = Boolean(sent[0]?.messages?.[0]?.id || sent[0]?.message_id);
  if (!accepted) {
    await SocialThread.updateOne(claimedFilter, { $unset: { manualReply: "" } });
    return res.status(502).json({ code: "REPLY_NOT_CONFIRMED" });
  }

  const now = new Date();
  await SocialThread.updateOne(claimedFilter, {
    $set: { lastOutboundAt: now, lastAgentEmail: req.inboxEmail },
    $push: { history: { $each: [{ role: "agent", content: image ? image.href : text, at: now, requestId, agentEmail: req.inboxEmail }], $slice: -40 } },
    $unset: { manualReply: "" },
  });
  res.json({ accepted: true });
}));

export default router;
