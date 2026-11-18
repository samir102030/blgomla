import { randomBytes, createHash } from "node:crypto";
import InboxMember from "../models/inboxMember.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { MongoRateLimitStore } from "../utils/rateLimitStore.js";

const cookieName = "__Secure-belgomla-inbox";
const cookiePath = "/api/social-inbox";
const inboxOrigin = "https://inbox.belgmla.com";
const sessionMs = 8 * 60 * 60 * 1000;
const cookieOptions = { httpOnly: true, secure: true, sameSite: "strict", path: cookiePath };
const claimOptions = { algorithm: "HS256", audience: "belgomla-inbox", issuer: "belgomla-inbox" };

const settings = () => {
  const email = process.env.INBOX_LOGIN_EMAIL?.trim().toLowerCase();
  const hash = process.env.INBOX_PASSWORD_HASH;
  const secret = process.env.INBOX_SESSION_SECRET;
  return email && hash?.startsWith("$2") && secret?.length >= 32 ? { email, hash, secret } : null;
};

const limitAttempts = (prefix) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: new MongoRateLimitStore({ prefix }),
  message: { code: "LOGIN_LIMIT" },
});

export const rejectForeignInboxWrites = (req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("origin") !== inboxOrigin) {
    return res.status(403).json({ code: "INVALID_ORIGIN" });
  }
  next();
};

export const loginInbox = [limitAttempts("rl:inbox-login"), async (req, res, next) => {
  const config = settings();
  if (!config) return res.status(503).json({ code: "INBOX_NOT_CONFIGURED" });
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = req.body?.password;
  try {
    if (typeof password !== "string" || !password || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(401).json({ code: "INVALID_LOGIN" });
    }
    const owner = email === config.email;
    const member = owner ? null : await InboxMember.findOne({ email }).lean();
    const hash = owner ? config.hash : member?.passwordHash;
    const valid = await bcrypt.compare(password, hash || config.hash);
    if (!valid || !hash) return res.status(401).json({ code: "INVALID_LOGIN" });

    openSession(res, config, email, owner ? "owner" : "member");
  } catch (error) {
    next(error);
  }
}];

function openSession(res, config, email, role) {
  const token = jwt.sign({ role }, config.secret, { ...claimOptions, subject: email, expiresIn: "8h" });
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionMs });
  res.json({ email, role });
}

const digest = (token) => createHash("sha256").update(token).digest("hex");

export const requireInboxSession = async (req, res, next) => {
  const config = settings();
  if (!config) return res.status(503).json({ code: "INBOX_NOT_CONFIGURED" });
  let claims;
  try {
    claims = jwt.verify(req.cookies?.[cookieName], config.secret, {
      algorithms: [claimOptions.algorithm], audience: claimOptions.audience, issuer: claimOptions.issuer,
    });
  } catch {
    return res.status(401).json({ code: "INBOX_SIGN_IN_REQUIRED" });
  }

  try {
    const email = claims.sub;
    const owner = claims.role === "owner" && email === config.email;
    const member = claims.role === "member" && typeof email === "string" &&
      await InboxMember.exists({ email, passwordHash: { $exists: true } });
    if (!owner && !member) return res.status(401).json({ code: "INBOX_SIGN_IN_REQUIRED" });
    req.inboxEmail = email;
    req.inboxRole = owner ? "owner" : "member";
    next();
  } catch (error) {
    next(error);
  }
};

export const requireInboxOwner = (req, res, next) => {
  if (req.inboxRole !== "owner") return res.status(403).json({ code: "OWNER_REQUIRED" });
  next();
};

export const listMembers = async (_req, res, next) => {
  try {
    const members = await InboxMember.find().select("email passwordHash inviteExpiresAt").sort({ email: 1 }).lean();
    res.json({ items: members.map(({ email, passwordHash, inviteExpiresAt }) => ({
      email, status: passwordHash ? "active" : new Date(inviteExpiresAt) > new Date() ? "pending" : "expired",
    })) });
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (req, res, next) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === req.inboxEmail) {
    return res.status(400).json({ code: "INVALID_MEMBER_EMAIL" });
  }
  try {
    const token = randomBytes(32).toString("hex");
    await InboxMember.updateOne({ email, passwordHash: { $exists: false } }, {
      $set: { inviteHash: digest(token), inviteExpiresAt: new Date(Date.now() + 86400000) },
    }, { upsert: true });
    res.status(201).json({ url: inboxOrigin + "/#invite=" + token });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ code: "MEMBER_EXISTS" });
    next(error);
  }
};

export const activateMember = [limitAttempts("rl:inbox-activation"), async (req, res, next) => {
  const config = settings();
  if (!config) return res.status(503).json({ code: "INBOX_NOT_CONFIGURED" });
  const { token, password } = req.body || {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) ||
      typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ code: "INVALID_ACTIVATION" });
  }
  try {
    const filter = { inviteHash: digest(token), inviteExpiresAt: { $gt: new Date() }, passwordHash: { $exists: false } };
    if (!await InboxMember.exists(filter)) return res.status(400).json({ code: "INVALID_ACTIVATION" });
    const member = await InboxMember.findOneAndUpdate(filter, {
      $set: { passwordHash: await bcrypt.hash(password, 12) },
      $unset: { inviteHash: "", inviteExpiresAt: "" },
    }).lean();
    if (!member) return res.status(400).json({ code: "INVALID_ACTIVATION" });
    openSession(res, config, member.email, "member");
  } catch (error) {
    next(error);
  }
}];

export const logoutInbox = (_req, res) => {
  res.clearCookie(cookieName, cookieOptions);
  res.sendStatus(204);
};
