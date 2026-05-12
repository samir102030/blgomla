import { v4 as uuidv4 } from "uuid";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";
import Visitor from "../models/visitor.model.js";

// Egyptian governorates mapping from region codes
const EGYPT_GOVERNORATES = {
  C: "Cairo",
  GZ: "Giza",
  ALX: "Alexandria",
  ASN: "Aswan",
  AST: "Asyut",
  BH: "Beheira",
  BNS: "Beni Suef",
  DK: "Dakahlia",
  DT: "Damietta",
  FYM: "Faiyum",
  GH: "Gharbia",
  IS: "Ismailia",
  KFS: "Kafr El Sheikh",
  LX: "Luxor",
  MN: "Minya",
  MNF: "Monufia",
  MT: "Matrouh",
  PTS: "Port Said",
  KB: "Qalyubia",
  KN: "Qena",
  SHR: "Al Sharqia",
  SIN: "North Sinai",
  JS: "South Sinai",
  SUZ: "Suez",
  SHG: "Sohag",
  WAD: "New Valley",
  BA: "Red Sea",
};

/**
 * Middleware to track visitor analytics.
 * Placed on API routes to track page visits.
 */
export const trackVisitor = async (req, res, next) => {
  try {
    // Skip tracking for non-GET requests and internal/admin API calls
    const path = req.originalUrl || req.url;

    // Only track page-related API calls (products, collections, etc.)
    // Skip auth, cart, and other utility endpoints
    const trackablePaths = [
      "/api/products",
      "/api/collections",
      "/api/brands",
      "/api/categories",
    ];
    const shouldTrack = trackablePaths.some((p) => path.startsWith(p));

    if (!shouldTrack || req.method !== "GET") {
      return next();
    }

    // Get or create session ID from cookie
    let sessionId = req.cookies?.visitorSession;
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie("visitorSession", sessionId, {
        maxAge: 30 * 60 * 1000, // 30 minutes
        httpOnly: true,
        sameSite: "lax",
      });
    }

    // Parse User-Agent
    const ua = new UAParser(req.headers["user-agent"]);
    const deviceType = ua.getDevice().type || "desktop"; // mobile, tablet, or desktop
    const browser = ua.getBrowser().name || "Unknown";
    const os = ua.getOS().name || "Unknown";

    // Normalize device type
    let device = "desktop";
    if (deviceType === "mobile") device = "mobile";
    else if (deviceType === "tablet") device = "tablet";

    // Get IP address
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.connection?.remoteAddress ||
      req.ip;

    // Geo lookup
    let country = "Unknown";
    let countryCode = "";
    let region = "";
    let city = "";
    let governorate = "";

    if (ip && ip !== "::1" && ip !== "127.0.0.1") {
      const geo = geoip.lookup(ip);
      if (geo) {
        country = geo.country || "Unknown";
        countryCode = geo.country || "";
        region = geo.region || "";
        city = geo.city || "";

        // Map Egyptian region code to governorate name
        if (countryCode === "EG" && region) {
          governorate = EGYPT_GOVERNORATES[region] || region;
        }
      }
    }

    // Upsert visitor record — add page visit to existing session or create new
    const pageVisit = { path, timestamp: new Date() };

    await Visitor.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          ipAddress: ip,
          userAgent: req.headers["user-agent"],
          device,
          browser,
          os,
          country,
          countryCode,
          region,
          city,
          governorate,
          referrer: req.headers.referer || req.headers.referrer || "",
          user: req.user?._id || null,
        },
        $push: { pagesVisited: pageVisit },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    // Don't let tracking errors break the request
    console.error("Visitor tracking error:", error.message);
  }

  next();
};

export default trackVisitor;
