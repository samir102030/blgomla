import { controllerWrapper } from "../../utils/wrappers.js";
import SiteMode, { getSiteMode } from "./siteMode.model.js";
import ComingSoonSubscriber from "./comingSoonSubscriber.model.js";
import { bustComingSoonCache } from "../../middleware/comingSoon.middleware.js";

// Public — fetch the active site mode. Cached at the CDN for 30s so the
// gate doesn't slam the API on every page load.
export const getPublicSiteMode = controllerWrapper(
  "getPublicSiteMode",
  async (req, res) => {
    const mode = await getSiteMode();
    res.setHeader(
      "Cache-Control",
      "public, max-age=30, s-maxage=30, stale-while-revalidate=300"
    );
    res.json({
      success: true,
      mode: {
        comingSoon: mode.comingSoon,
        title: mode.title,
        message: mode.message,
        launchAt: mode.launchAt,
        socialLinks: mode.socialLinks,
        // Never expose previewKey, allowAdminBypass, or blockPublicApi publicly.
      },
    });
  }
);

// Admin — fetch full site mode incl. previewKey and toggles.
export const getAdminSiteMode = controllerWrapper(
  "getAdminSiteMode",
  async (req, res) => {
    const mode = await getSiteMode();
    res.json({ success: true, mode });
  }
);

// Admin — update site mode.
export const updateSiteMode = controllerWrapper(
  "updateSiteMode",
  async (req, res) => {
    const allowed = [
      "comingSoon",
      "title",
      "message",
      "launchAt",
      "previewKey",
      "allowAdminBypass",
      "blockPublicApi",
      "socialLinks",
    ];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }

    const mode = await SiteMode.findOneAndUpdate(
      { key: "default" },
      { $set: patch },
      { new: true, upsert: true }
    );
    bustComingSoonCache();
    res.json({ success: true, mode });
  }
);

// Public — capture email during coming-soon period.
export const subscribeComingSoon = controllerWrapper(
  "subscribeComingSoon",
  async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const locale = String(req.body.locale || "en").slice(0, 5);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email address" });
    }

    try {
      await ComingSoonSubscriber.updateOne(
        { email },
        { $setOnInsert: { email, locale, source: "coming-soon" } },
        { upsert: true }
      );
    } catch (err) {
      // duplicate key — treat as success (idempotent subscribe)
      if (err?.code !== 11000) throw err;
    }

    res.json({ success: true });
  }
);

// Admin — list captured subscribers.
export const listSubscribers = controllerWrapper(
  "listSubscribers",
  async (req, res) => {
    const subs = await ComingSoonSubscriber.find()
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    res.json({ success: true, subscribers: subs, total: subs.length });
  }
);
