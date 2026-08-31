import { rateLimit } from "express-rate-limit";

import { MongoRateLimitStore } from "../utils/rateLimitStore.js";

/**
 * The limiters that guard endpoints the global one in `app.js` is too loose
 * for. That one allows 1000 requests a quarter hour per IP, which is a
 * sensible ceiling for browsing and no ceiling at all for anything that
 * checks a credential or sends a message.
 *
 * They live here rather than beside a single router because more than one
 * router needs them, and a limiter that is copied is a limiter whose two
 * copies drift apart.
 *
 * All of them share the Mongo-backed store: with express-rate-limit's default
 * per-process memory store, every warm Lambda hands out a fresh budget, so
 * the effective limit is `max × live instances` and it resets whenever a
 * container is recycled.
 */

/**
 * Credential handling — login, signup, password reset, email verification.
 * Keyed by IP, and successful requests are refunded, so a person who signs in
 * correctly twenty times never notices it while someone spraying passwords
 * runs out after ten.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new MongoRateLimitStore({ prefix: "rl:auth" }),
});

/**
 * Asking the shop to send a confirmation link to a university mailbox.
 *
 * Keyed by account, deliberately not by IP. A faculty sits behind one campus
 * NAT, so an IP-keyed limit would count every student on the network as the
 * same person and throttle a whole department the week the programme opens —
 * exactly the people it exists for. The account is the thing being abused
 * when this is abused, so the account is what to count.
 *
 * Successes count. This is the opposite of `authLimiter`, and for the same
 * reason it is the right way round there: on the auth routes a success is a
 * person proving who they are, and here a success is a message leaving the
 * shop's sending domain. Refunding those would leave the ceiling at
 * "unlimited, as long as every request works".
 *
 * Six an hour is far above honest use — a student needs one, or a handful if
 * they mistype the address — and far below anything worth doing with a mail
 * relay.
 *
 * Rejected attempts are refunded. A student guessing at which of their
 * addresses the faculty registered gets a 422 and no mail is sent, so there
 * is nothing to charge them for; charging anyway would lock them out for an
 * hour for the crime of not knowing the answer. The IP limiter below is what
 * catches somebody hammering rejections.
 */
export const studentMailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  message: {
    success: false,
    message:
      "Too many confirmation links requested for this account. Try again in an hour, or contact support.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  keyGenerator: (req) => String(req.user?._id || "anonymous"),
  store: new MongoRateLimitStore({ prefix: "rl:student-mail" }),
});

/**
 * The same endpoint, seen from the other side: one host driving many accounts.
 *
 * The per-account limit above is the real control; this is the backstop for
 * someone who registers accounts in bulk and spends each one's six. The
 * ceiling is set high enough that a campus opening the programme together
 * never reaches it.
 */
export const studentMailIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many requests from this network. Please try again shortly.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new MongoRateLimitStore({ prefix: "rl:student-mail-ip" }),
});

/**
 * Opening a confirmation link.
 *
 * The token is 32 random bytes, so guessing one is not a threat worth pricing;
 * what this stops is a host hammering the endpoint with rubbish. Successful
 * confirmations are refunded, so the only requests that spend the budget are
 * the ones that failed — which is the signal, and means a lecture hall
 * confirming at once is never affected.
 */
export const studentVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new MongoRateLimitStore({ prefix: "rl:student-verify" }),
});

/**
 * Talking to the support assistant.
 *
 * Every question costs the shop a database read and, once a model key is
 * configured, a paid call — so the ceiling is per host rather than per
 * account: the endpoint is open to visitors, and an account is exactly what
 * somebody driving it in bulk would not bother to make.
 *
 * Forty in a quarter of an hour is a long conversation typed by a person and
 * a short one written by a script. A customer who reaches it is having a
 * genuinely hard day, which is what the hand-off to a human is for.
 */
/**
 * The contact form.
 *
 * The only write on this API an anonymous stranger can perform, which makes
 * it the only one where a script can fill a collection unaided. Generous
 * enough that a customer who mistypes their address and sends again twice is
 * never turned away, tight enough that nobody fills the inbox from a laptop.
 */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "That is a lot of messages in one hour. Please give us a little time to reply to the ones you have already sent.",
  },
});

export const supportAssistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: {
    success: false,
    message: "Too many messages. Please wait a moment, or contact support directly.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new MongoRateLimitStore({ prefix: "rl:support-assistant" }),
});

/**
 * Handing a file to Cloudinary.
 *
 * `POST /upload/upload` is behind `protectRoute` and nothing more, and that
 * is the right shape: the callers are a customer setting a profile picture, a
 * vendor adding store and product media, and an administrator uploading
 * banners. Requiring an admin here would break the first two.
 *
 * What it lacked was a ceiling. The global limiter allows a thousand requests
 * a quarter hour, so a single signed-up customer could spend that budget
 * entirely on uploads and repeat it from the next address. Nothing about that
 * is an intrusion — it is a bill, paid to Cloudinary for storage and
 * bandwidth, arriving without anyone having decided to spend it.
 *
 * Keyed by account rather than by IP. A shop's staff add products from one
 * office behind one address, and counting them as one uploader would throttle
 * the working day; the account is also the thing being abused when this is
 * abused. Anonymous callers cannot reach here at all — `protectRoute` answers
 * first — so the IP fallback only ever applies if that order is changed.
 *
 * Successes count, unlike the auth limiter. There a success is a person
 * proving who they are and refunding it costs nothing; here a success is a
 * file that now sits on the account and is billed for, which is precisely the
 * thing being counted.
 *
 * A hundred and twenty in a quarter hour is eight a minute sustained. A person
 * filling in product forms and picking photographs does not approach it; a
 * loop does so in under a minute.
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  keyGenerator: (req) => (req.user?._id ? `u:${req.user._id}` : `ip:${req.ip}`),
  message: {
    success: false,
    message: "Too many uploads. Please wait a few minutes and try again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new MongoRateLimitStore({ prefix: "rl:upload" }),
});
