import mongoose from "mongoose";

/**
 * Failed sign-in attempts, counted per account rather than per address.
 *
 * The auth limiter already caps an IP at ten attempts a quarter hour, and that
 * is the right control for one attacker on one connection. It is the wrong
 * control for the attack people actually run: residential proxies cost a few
 * dollars a day, and a hundred of them give an attacker a thousand guesses at
 * one password in the same window, every single address politely inside its
 * budget. The address is the thing being spread out, so the address cannot be
 * the only thing being counted. This counts the account.
 *
 * Two decisions here are deliberate, and both are about not building the
 * outage we are trying to prevent.
 *
 * **It delays, it does not lock.** A lockout looks stronger and is a weapon
 * pointed the wrong way: anyone who knows a customer's email can fail eight
 * times on purpose and lock them out, and doing that across the customer list
 * takes down every account on the shop without touching a server. OWASP's
 * cheat sheet recommends the exponential backoff for exactly this reason. The
 * window starts at a second and doubles, so a human who mistyped their
 * password twice notices nothing, and a script trying its thousandth guess is
 * waiting five minutes between attempts. Nobody is ever permanently shut out.
 *
 * **The wait is refused, not slept through.** The obvious implementation is to
 * hold the request for the delay and then answer it. On Vercel that means
 * holding a Lambda open, so an attacker who wants the site down stops guessing
 * passwords and just opens a few hundred deliberately-delayed logins until
 * there is no concurrency left for customers. The defence would have become
 * the attack. So the request is answered immediately with a refusal; the delay
 * is a time in the future, not a thread that is waiting.
 *
 * The caller says nothing about any of this to the client — the message stays
 * the same "Invalid credentials" every other failure returns. Telling somebody
 * their attempt was throttled tells them the account exists.
 */

const loginAttemptSchema = new mongoose.Schema(
  {
    // The email or phone as it was typed, normalised. Not hashed: these are
    // already stored in plain form on the user document, so hashing here would
    // add a step without adding a secret.
    key: { type: String, required: true, unique: true, index: true },
    failures: { type: Number, default: 0 },
    // Attempts before this moment are refused outright.
    blockedUntil: { type: Date, default: null },
    lastFailureAt: { type: Date, default: Date.now },
    lastIp: { type: String, default: null },
    // How many distinct addresses have failed against this account. One
    // address failing repeatedly is usually somebody who forgot their
    // password; forty addresses failing against one account is not.
    distinctIps: { type: [String], default: [] },
    // Cleared on success, kept for the security page until then.
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: true }
);

// Rows are evidence for as long as the attack is live and clutter afterwards.
loginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
loginAttemptSchema.index({ blockedUntil: -1 });

/** A first mistype should cost nothing; the tenth should cost real time. */
const FREE_ATTEMPTS = 4;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 5 * 60 * 1000;
const FORGET_AFTER_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKED_IPS = 50;

export const normaliseKey = (value) =>
  String(value || "").trim().toLowerCase();

const LoginAttempt =
  mongoose.models.LoginAttempt ||
  mongoose.model("LoginAttempt", loginAttemptSchema);

/**
 * Is this account currently inside a refusal window?
 * Returns the milliseconds remaining, or 0 when the attempt may proceed.
 */
export const attemptBlockedFor = async (identifier) => {
  const key = normaliseKey(identifier);
  if (!key) return 0;
  const row = await LoginAttempt.findOne({ key }).lean();
  if (!row?.blockedUntil) return 0;
  const remaining = new Date(row.blockedUntil).getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
};

/**
 * Record a failure and widen the window.
 *
 * The first few cost nothing at all, because most failed sign-ins are a real
 * customer on the wrong keyboard layout. After that each one doubles the wait,
 * up to five minutes — enough to make guessing pointless, short enough that a
 * customer who comes back later is never stuck.
 */
export const recordFailedAttempt = async (identifier, ip) => {
  const key = normaliseKey(identifier);
  if (!key) return { failures: 0, delayMs: 0 };

  const row =
    (await LoginAttempt.findOne({ key })) ||
    new LoginAttempt({ key, expiresAt: new Date(Date.now() + FORGET_AFTER_MS) });

  row.failures += 1;
  row.lastFailureAt = new Date();
  row.lastIp = ip || row.lastIp;
  if (ip && !row.distinctIps.includes(ip) && row.distinctIps.length < MAX_TRACKED_IPS) {
    row.distinctIps.push(ip);
  }

  const over = row.failures - FREE_ATTEMPTS;
  const delayMs =
    over <= 0 ? 0 : Math.min(BASE_DELAY_MS * 2 ** (over - 1), MAX_DELAY_MS);

  row.blockedUntil = delayMs ? new Date(Date.now() + delayMs) : null;
  row.expiresAt = new Date(Date.now() + FORGET_AFTER_MS);
  await row.save();

  return { failures: row.failures, delayMs, distinctIps: row.distinctIps.length };
};

/** A correct password ends the story: the counter goes away entirely. */
export const clearFailedAttempts = async (identifier) => {
  const key = normaliseKey(identifier);
  if (!key) return;
  await LoginAttempt.deleteOne({ key });
};

/** What the security page reads. Never returns the counters as credentials. */
export const recentAttackedAccounts = async (limit = 50) => {
  return LoginAttempt.find({ failures: { $gte: FREE_ATTEMPTS } })
    .sort({ lastFailureAt: -1 })
    .limit(limit)
    .select("key failures blockedUntil lastFailureAt lastIp distinctIps")
    .lean();
};

export { FREE_ATTEMPTS, MAX_DELAY_MS };
export default LoginAttempt;
