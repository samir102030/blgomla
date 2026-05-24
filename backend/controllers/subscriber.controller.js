import Subscriber from "../models/subscriber.model.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public: subscribe an email (idempotent upsert).
export const subscribe = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const source = ["newsletter", "exit-intent", "popup", "checkout"].includes(
      req.body.source
    )
      ? req.body.source
      : "newsletter";

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    await Subscriber.findOneAndUpdate(
      { email },
      { $setOnInsert: { email, source }, $set: { isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, message: "Subscribed" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Failed to subscribe" });
  }
};

// Admin: list subscribers.
export const getSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, count: subscribers.length, subscribers });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};
