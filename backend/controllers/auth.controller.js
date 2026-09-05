import crypto from "crypto";
import Category from "../models/category.model.js";
import Role from "../models/role.model.js";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.model.js";
import {
  attemptBlockedFor,
  recordFailedAttempt,
  clearFailedAttempts,
} from "../models/loginAttempt.model.js";
import { paginateQuery } from "../utils/pagination.js";

import {
  generateTokensAndSetCookies,
  generateToken,
  clearAuthCookies,
  authCookieOptions,
  ACCESS_TOKEN_MAX_AGE,
} from "../middleware/token.js";
import { controllerWrapper } from "../utils/wrappers.js";
import Store from "../models/store.model.js";
import Address from "../models/address.model.js";
import Product from "../models/product.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } from "../utils/email.js";
import { logAudit, diff } from "../utils/audit.js";
import { getUserPermissions, userCan } from "../utils/permissions.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isSuperAdmin = (user) => user?.role === "super_admin";

// Emails are matched case-insensitively via regex (legacy rows predate the
// lowercasing pre-save hook). User input must be escaped first — an
// unescaped `.*` matches every row, and nested quantifiers cause ReDoS.
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const emailMatch = (email) => new RegExp(`^${escapeRegex(email)}$`, "i");

// Fields that must never reach an admin list view. `totpSecret` and
// `pushSubscriptions` are already `select: false` on the schema; these are not.
const SENSITIVE_USER_FIELDS =
  "-password -resetPasswordToken -resetPasswordExpiresAt -verificationToken -verificationTokenExpiresAt";

// Password-reset tokens are stored hashed, never in plaintext.
const hashResetToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

// Compare secrets without short-circuiting on the first differing byte.
// Hashing both sides first sidesteps timingSafeEqual's equal-length
// requirement, which would otherwise leak the expected length.
const secretsMatch = (a, b) => {
  const digest = (value) =>
    crypto.createHash("sha256").update(String(value ?? "")).digest();
  return crypto.timingSafeEqual(digest(a), digest(b));
};

// Roles that can never be handed out over the API. Admin accounts are minted
// out-of-band; without this an actor holding only `users.edit` could promote
// themselves straight to super_admin.
const PRIVILEGED_ROLES = ["admin", "super_admin"];

/*
  The only roles a person may put on their own account at registration.

  The old test was `role !== "admin"`, which reads like a guard and is not
  one: it blocks exactly one string. `validateSignup` never looks at `role`,
  the schema has no enum so any custom role key is accepted, and the schema's
  `lowercase` setter means even "Admin" would have landed as `admin` had the
  comparison been case-sensitive the other way. So the registration form —
  open to anyone on the internet — would mint a `super_admin` for whoever
  typed it into the request body, and email them the code to verify it.

  A whitelist rather than a blacklist, because the set of roles that are safe
  to self-assign is two and the set that is not is open-ended: every role
  Roles & Access will ever create belongs on the other side of this line.
*/
const SELF_ASSIGNABLE_ROLES = ["customer", "store"];

/*
  The schema stores `role` trimmed and lower-cased. A guard that compares the
  raw value is therefore checking a different string from the one that gets
  written: `"super_admin "` is not in PRIVILEGED_ROLES, passes, and is saved
  as `super_admin`. Normalise on the way in so the guard and the write agree.
*/
const normaliseRole = (value) => String(value ?? "").trim().toLowerCase();

/*
  Whether this account is one the shop cannot afford to lose.

  Both privileged roles plus vendors: a compromised `store` account can alter
  prices and publish products, which is not the same blast radius as an admin
  but is not a customer's either.
*/
const shouldUseTwoFactor = (user) =>
  PRIVILEGED_ROLES.includes(user?.role) || user?.role === "store";

/*
  Whether a privileged account without 2FA is *refused*, as opposed to nagged.

  Off unless `REQUIRE_ADMIN_2FA` is set, and that default is the whole point.
  Turning enforcement on before the people it applies to have enrolled locks
  them out of the dashboard, and the first person it would lock out is
  whoever is reading this — there is no second admin to let them back in.

  So the sequence is: ship this, enrol, confirm the recovery codes are saved,
  then set the variable. Until then every login still reports
  `twoFactorRecommended` so the dashboard can ask, which is the part that
  actually gets people enrolled.
*/
const twoFactorEnforced = () =>
  String(process.env.REQUIRE_ADMIN_2FA ?? "").toLowerCase() === "true";

const guardSuperAdminMutation = async (targetUserId, actor) => {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }
  if (isSuperAdmin(targetUser) && !isSuperAdmin(actor)) {
    return {
      status: 403,
      body: { success: false, message: "Cannot modify a super admin account" },
    };
  }
  return { targetUser };
};
export const signup = controllerWrapper("signup", async (req, res) => {
  const { email, password, name, phoneNumber, role, storeDescription, referralCode, deliveryAddress } =
    req.body;

  // Anything outside the whitelist silently becomes a customer rather than a
  // 400: the field is not on any form we ship, so a request carrying one is
  // either a mistake or an attempt, and neither deserves an error message
  // that confirms which roles exist.
  // `typeof` first: an array coerces to its joined contents, so `["store"]`
  // would otherwise pass the whitelist. It happens to be harmless here, but a
  // guard that depends on which shapes coerce favourably is not a guard.
  const requestedRole = typeof role === "string" ? normaliseRole(role) : "";
  const signupRole = SELF_ASSIGNABLE_ROLES.includes(requestedRole)
    ? requestedRole
    : "customer";

  if (await User.findOne({ email: emailMatch(email) }))
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });

  // Resolve a referral code to the referring user (best-effort — a bad code
  // never blocks signup).
  let referredBy;
  if (referralCode && String(referralCode).trim()) {
    const referrer = await User.findOne({
      referralCode: String(referralCode).trim().toUpperCase(),
    }).select("_id");
    if (referrer) referredBy = referrer._id;
  }

  const verificationToken = crypto.randomBytes(3).toString("hex").toUpperCase();

  // Capture the user's preferred language from the Accept-Language header
  // so transactional emails go out in the right locale. Front-end's axios
  // client already sends "Accept-Language: en" or "ar" on every request.
  const acceptLang = String(req.headers["accept-language"] || "").toLowerCase();
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";

  const user = new User({
    email,
    password,
    name,
    phoneNumber,
    lang,
    verificationToken,
    verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    role: signupRole,
    referredBy,
    lastLogin: new Date(),
    active: true, // Set active to true by default
  });
  await user.save();

  // Created after the user so a failed save (duplicate email, validation)
  // doesn't leave an orphan store behind. Declared out here because the
  // response below reports it back to the vendor.
  // A location shared during registration becomes the account's first
  // address, saved here rather than by the browser afterwards: signup
  // deliberately issues no session — the emailed code has to be verified
  // first — so anything picked on the form would be lost between the two
  // steps unless it travels with the registration itself.
  //
  // Never fatal. Somebody who shared their location and got "registration
  // failed" would have no idea the two were connected, and the account is
  // already saved by this point.
  if (deliveryAddress?.address && deliveryAddress?.city) {
    try {
      await Address.create({
        user: user._id,
        name: user.name,
        phone: user.phoneNumber,
        address: String(deliveryAddress.address).slice(0, 300),
        city: String(deliveryAddress.city).slice(0, 120),
        state: deliveryAddress.state ? String(deliveryAddress.state).slice(0, 120) : undefined,
        type: "Shipping",
        isDefault: true,
      });
    } catch (err) {
      console.error("Could not save the address shared at signup:", err.message);
    }
  }

  let store;
  if (signupRole === "store") {
    store = new Store({
      name: user.name,
      owner: user._id,
      description: storeDescription || "Store description",
    });
    await store.save();
  }

  logAudit(req, "user.registered", "user", user._id, {
    role: user.role,
    method: "password",
    referred: Boolean(referredBy),
  }, { actor: user, target: user, category: "account" });

  // Send welcome email with verification code (non-blocking).
  sendWelcomeEmail(user).catch((err) =>
    console.error("Failed to send welcome email:", err)
  );

  // Do NOT issue cookies here. The user must verify their email before a
  // session is created — the /verifyEmail endpoint sets cookies on success.
  // This prevents the half-state where a fresh signup is briefly logged in
  // but every protected request 403s with EMAIL_NOT_VERIFIED.

  res.status(201).json({
    success: true,
    message: "User created. Check your email for a verification code.",
    requiresVerification: true,
    user: {
      ...user._doc,
      password: undefined,
      verificationToken: undefined,
      verificationTokenExpiresAt: undefined,
      store: role === "store" ? store : undefined,
    },
  });
});

// Generate a short, unique referral code (best-effort retry on collision).
const generateReferralCode = async () => {
  for (let i = 0; i < 5; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  return crypto.randomBytes(6).toString("hex").toUpperCase();
};

// GET /api/users/referral — returns the caller's referral code (lazily created)
// plus how many referrals have converted.
export const getReferralInfo = controllerWrapper(
  "getReferralInfo",
  async (req, res) => {
    let user = await User.findById(req.user._id).select(
      "referralCode referralCount"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.referralCode) {
      const code = await generateReferralCode();
      user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { referralCode: code } },
        { new: true }
      ).select("referralCode referralCount");
    }
    res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      referralCount: user.referralCount || 0,
    });
  }
);

export const reSendVerificationEmail = controllerWrapper(
  "reSendVerificationEmail",
  async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const user = await User.findOne({ email: emailMatch(email) });

    // Don't reveal whether the email exists — return the same response
    // either way to prevent account enumeration via this endpoint.
    if (!user || user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "If the email is registered and unverified, a code has been sent.",
      });
    }

    // Match the signup code shape (6 uppercase hex chars) so verifyEmail's
    // toUpperCase() normalization works uniformly across both paths.
    const verificationToken = crypto.randomBytes(3).toString("hex").toUpperCase();

    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    // Send verification email (non-blocking)
    sendVerificationEmail(user).catch((err) =>
      console.error("Failed to send verification email:", err)
    );

    res.status(200).json({
      success: true,
      message: "If the email is registered and unverified, a code has been sent.",
    });
  },
);

export const verifyEmail = controllerWrapper(
  "verifyEmail",
  async (req, res) => {
    const { code, email } = req.body;
    if (!code || !email) {
      return res.status(400).json({
        success: false,
        message: "Email and code are required",
      });
    }
    // Signup generates the code with .toUpperCase() but the resend path
    // emits a numeric code; accept either by normalising the comparison.
    // Email lookup is also case-insensitive since the DB pre-save hook
    // lowercases new emails but we can't assume that's true of legacy rows.
    const normalizedCode = String(code).trim().toUpperCase();
    const user = await User.findOne({ email: emailMatch(email) });
    if (!user || !user.verificationToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code or User not found",
      });
    }
    if (!secretsMatch(String(user.verificationToken).toUpperCase(), normalizedCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }
    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Expired verification code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    try {
      await Notification.create({
        user: user._id,
        title: "Account Verified",
        message: "Your account has been successfully verified.",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating verification notification:", error);
    }

    // Issue cookies so the user lands already logged in. Skipped only if
    // 2FA is enabled — those users must complete the second factor flow
    // through /login, not via this endpoint.
    if (!user.twoFactorEnabled) {
      generateTokensAndSetCookies(res, user._id, user.tokenVersion ?? 0);
    }

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        ...user._doc,
        password: undefined,
        totpSecret: undefined,
        store:
          user.role === "store"
            ? await Store.findOne({ owner: user._id })
            : undefined,
      },
    });
  },
);

export const login = controllerWrapper("login", async (req, res) => {
  const { email, phone, password, totpCode } = req.body;

  /*
    Per-account throttling, checked before the account is even looked up.

    The IP limiter above this handles one attacker on one connection. It does
    nothing about the attack people actually run: a hundred cheap residential
    proxies give a thousand guesses at one password in the same quarter hour,
    every address comfortably inside its own budget. The address is what gets
    spread out, so the address cannot be the only thing counted.

    Refused rather than delayed — see the note on the model. Holding the
    request for the wait would hold a Lambda open with it, and a few hundred
    deliberately-throttled logins would then exhaust concurrency and take the
    site down, which is the thing this is here to prevent.

    The message is the same "Invalid credentials" as every other failure.
    Saying "you are being throttled" would confirm the account exists, which
    is a different thing to leak and no less useful to an attacker.
  */
  const identifier = email || phone;
  if (identifier) {
    const blockedFor = await attemptBlockedFor(identifier);
    if (blockedFor > 0) {
      logAudit(
        req,
        "auth.login_throttled",
        "auth",
        undefined,
        { identifier, retryInMs: blockedFor },
        { status: "failure", severity: "warning", category: "security" }
      );
      // Retry-After is in seconds and is the honest thing to send a client
      // that is behaving; it tells a script nothing it could not measure.
      res.set("Retry-After", String(Math.ceil(blockedFor / 1000)));
      return res.status(429).json({
        success: false,
        message: "Invalid credentials",
      });
    }
  }
  // Email takes precedence when both are supplied. Previously the phone
  // lookup ran second and overwrote an email match, and only the email branch
  // populated `love`, so the same account came back with different shapes
  // depending on which field the client happened to send.
  let user;
  if (email) {
    user = await User.findOne({ email: emailMatch(email) })
      .select("+totpSecret +twoFactorRecoveryCodes")
      .populate("love");
  } else if (phone) {
    user = await User.findOne({ phoneNumber: phone })
      .select("+totpSecret +twoFactorRecoveryCodes")
      .populate("love");
  }
  if (!user) {
    logAudit(
      req,
      "auth.login_failed",
      "auth",
      undefined,
      { email, phone, reason: "user_not_found" },
      { status: "failure", severity: "warning", category: "security" }
    );
    // Counted even though no account matched: an attacker walking a list of
    // addresses must not be able to tell "no such account" from "wrong
    // password" by watching which one starts costing time.
    await recordFailedAttempt(identifier, req.ip);
    return res.status(400).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  // Google-only accounts have no password hash. bcrypt.compare throws on an
  // undefined hash, which surfaced as a 500 instead of a clean rejection.
  if (!user.password) {
    logAudit(
      req,
      "auth.login_failed",
      "auth",
      user._id,
      { email: user.email, reason: "no_password_set" },
      { status: "failure", severity: "warning", category: "security", actor: user }
    );
    return res.status(400).json({
      success: false,
      code: "USE_GOOGLE_SIGNIN",
      message: "This account signs in with Google. Use the Google button instead.",
    });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    logAudit(
      req,
      "auth.login_failed",
      "auth",
      user._id,
      { email: user.email, reason: "bad_password" },
      { status: "failure", severity: "warning", category: "security", actor: user }
    );
    await recordFailedAttempt(identifier, req.ip);
    return res
      .status(400)
      .json({ success: false, message: "Invalid credentials" });
  }

  // The password was right, so whatever the counter had accumulated was a
  // customer who could not remember it, not an attack. Cleared here rather
  // than after the second factor: somebody holding the correct password is
  // not who the throttle is aimed at, and leaving it armed would keep
  // punishing them through an unrelated TOTP retry.
  await clearFailedAttempts(identifier);

  // Require verified email before issuing a session. Existing rows where
  // isVerified is undefined are treated as not-yet-verified.
  if (!user.isVerified) {
    return res.status(403).json({
      success: false,
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before logging in. We sent a code to your inbox.",
    });
  }

  /*
    Set only when a recovery code was spent, so the response can tell the
    person how many they have left. Silence on a normal login is deliberate —
    the count is not news unless one has just been used.
  */
  let remainingRecoveryCodes;

  // Optional second factor. If the user has enrolled in TOTP, require a
  // valid code before issuing cookies. Front-end signals enrollment by
  // first POSTing without totpCode (gets a 401 + code:"TOTP_REQUIRED"),
  // then re-posting with the 6-digit code from the authenticator app.
  if (user.twoFactorEnabled) {
    if (!totpCode) {
      return res.status(401).json({
        success: false,
        code: "TOTP_REQUIRED",
        message: "Enter the 6-digit code from your authenticator app.",
      });
    }
    const { verifyTOTP } = await import("../utils/totp.js");
    if (!verifyTOTP(user.totpSecret, totpCode)) {
      /*
        Not the app's code — so try it as a recovery code before refusing.

        This is the path that exists for the phone that fell in the sea. It
        is deliberately the same field on the same form: someone locked out
        is not in a state to hunt for a second input, and the two code shapes
        (six digits versus `a1b2-c3d4`) cannot be mistaken for each other.

        The code is spent whether or not the rest of the login succeeds,
        which is the correct way round — a code that has been transmitted
        should not be reusable, and there are nine more.
      */
      const { consumeRecoveryCode, countUnusedRecoveryCodes } = await import(
        "../utils/recoveryCodes.js"
      );
      const index = consumeRecoveryCode(user.twoFactorRecoveryCodes, totpCode);
      if (index === -1) {
        logAudit(
          req,
          "auth.login_failed",
          "auth",
          user._id,
          { email: user.email, reason: "totp_invalid" },
          { status: "failure", severity: "warning", category: "security", actor: user }
        );
        return res.status(401).json({
          success: false,
          code: "TOTP_INVALID",
          message: "Invalid authenticator code.",
        });
      }
      user.twoFactorRecoveryCodes[index].usedAt = new Date();
      user.markModified("twoFactorRecoveryCodes");
      await user.save();
      remainingRecoveryCodes = countUnusedRecoveryCodes(user.twoFactorRecoveryCodes);
      // Worth a security-category line of its own: a recovery code being spent
      // is either the owner in trouble or somebody who found the printout.
      logAudit(req, "auth.2fa_recovery_used", "auth", user._id,
        { email: user.email, remaining: remainingRecoveryCodes },
        { severity: "warning", category: "security", actor: user });
    }
  }

  /*
    A privileged account with no second factor.

    When enforcement is off — the default — this only sets a flag the
    dashboard can act on, and the login proceeds exactly as before. When it is
    on, the account is refused with an answer that says what to do rather than
    just "no".
  */
  const twoFactorRecommended = shouldUseTwoFactor(user) && !user.twoFactorEnabled;
  if (twoFactorRecommended && twoFactorEnforced()) {
    logAudit(req, "auth.login_blocked_no_2fa", "auth", user._id,
      { email: user.email, role: user.role },
      { status: "failure", severity: "warning", category: "security", actor: user });
    return res.status(403).json({
      success: false,
      code: "TWO_FACTOR_REQUIRED_SETUP",
      message:
        "This account needs two-factor authentication before it can sign in. Ask an administrator to enrol it, or turn REQUIRE_ADMIN_2FA off to sign in and enrol yourself.",
    });
  }

  generateTokensAndSetCookies(res, user._id, user.tokenVersion ?? 0);

  user.lastLogin = new Date();
  await user.save();

  logAudit(req, "auth.login", "auth", user._id, { method: "password" }, {
    actor: user,
    category: "security",
  });

  return res.status(200).json({
    success: true,
    message: "Logged in successfully",
    ...(remainingRecoveryCodes !== undefined ? { remainingRecoveryCodes } : {}),
    ...(twoFactorRecommended ? { twoFactorRecommended: true } : {}),
    user: {
      ...user._doc,
      password: undefined,
      totpSecret: undefined,
      twoFactorRecoveryCodes: undefined,
      permissions: await getUserPermissions(user),
      store:
        user.role === "store"
          ? await Store.findOne({ owner: user._id })
          : undefined,
    },
  });
});

export const googleSignIn = controllerWrapper("googleSignIn", async (req, res) => {
  const { credential, totpCode } = req.body;
  if (!credential) {
    return res.status(400).json({
      success: false,
      message: "Missing Google credential",
    });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      message: "Google Sign-In is not configured on the server",
    });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid Google credential",
    });
  }

  const { sub: googleId, email, name, picture, email_verified } = payload || {};
  if (!email || !email_verified) {
    return res.status(400).json({
      success: false,
      message: "Google account email is missing or unverified",
    });
  }

  const acceptLang = String(req.headers["accept-language"] || "").toLowerCase();
  const lang = acceptLang.startsWith("ar") ? "ar" : "en";

  // Deleted rows are excluded: a soft-deleted account keeps its row, and
  // before the deletion fix above it kept its `googleId` too — so this found
  // the dead account, issued cookies for it, and every request afterwards
  // answered "Account is inactive or deleted".
  let user = await User.findOne({
    $or: [{ googleId }, { email: emailMatch(email) }],
    deleted: { $ne: true },
  });

  if (user) {
    let dirty = false;
    /*
      Linking to an account that was never verified retires its password.

      The pre-hijack: somebody registers with your address and a password of
      their choosing. They cannot use it — the account is unverified — so it
      sits there. You later sign in with Google, this matches you by email,
      flips `isVerified` to true, and hands you the account. It is now a
      working account with their password still on it, and they can sign in
      beside you and read every order and address you add.

      Nothing is lost by clearing it: an unverified password has never been
      used to sign in, and its owner — if they were genuine — can set one
      through the reset flow, which does prove the address.
    */
    if (!user.googleId) { user.googleId = googleId; dirty = true; }
    if (!user.isVerified) {
      if (user.password) {
        user.password = undefined;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
        logAudit(req, "auth.unverified_password_cleared", "user", user._id,
          { email: user.email, reason: "google_link_to_unverified_account" },
          { target: user, severity: "warning", category: "security" });
      }
      user.isVerified = true;
      dirty = true;
    }
    if (!user.profilePicture && picture) { user.profilePicture = picture; dirty = true; }
    if (!user.name && name) { user.name = name; dirty = true; }
    user.lastLogin = new Date();
    if (dirty) await user.save();
    else await user.save();
  } else {
    user = await User.create({
      email,
      name,
      googleId,
      profilePicture: picture,
      isVerified: true,
      role: "customer",
      active: true,
      lang,
      lastLogin: new Date(),
    });
    sendWelcomeEmail(user).catch((err) =>
      console.error("Failed to send welcome email:", err)
    );
  }

  let remainingRecoveryCodes;

  // Second factor, mirroring the password login flow: the client re-posts the
  // same Google credential together with the 6-digit code. Previously this
  // branch returned TOTP_REQUIRED but the handler accepted no code, so anyone
  // who enrolled in 2FA could never sign in with Google again.
  if (user.twoFactorEnabled) {
    if (!totpCode) {
      return res.status(401).json({
        success: false,
        code: "TOTP_REQUIRED",
        message: "Enter the 6-digit code from your authenticator app.",
      });
    }
    const { verifyTOTP } = await import("../utils/totp.js");
    const enrolled = await User.findById(user._id).select("+totpSecret +twoFactorRecoveryCodes");
    if (!verifyTOTP(enrolled?.totpSecret, totpCode)) {
      // Same fallback as the password path — see the comment there.
      const { consumeRecoveryCode, countUnusedRecoveryCodes } = await import(
        "../utils/recoveryCodes.js"
      );
      const index = consumeRecoveryCode(enrolled?.twoFactorRecoveryCodes, totpCode);
      if (index === -1) {
        logAudit(
          req,
          "auth.login_failed",
          "auth",
          user._id,
          { email: user.email, reason: "totp_invalid", method: "google" },
          { status: "failure", severity: "warning", category: "security", actor: user }
        );
        return res.status(401).json({
          success: false,
          code: "TOTP_INVALID",
          message: "Invalid authenticator code.",
        });
      }
      enrolled.twoFactorRecoveryCodes[index].usedAt = new Date();
      enrolled.markModified("twoFactorRecoveryCodes");
      await enrolled.save();
      remainingRecoveryCodes = countUnusedRecoveryCodes(enrolled.twoFactorRecoveryCodes);
      logAudit(req, "auth.2fa_recovery_used", "auth", user._id,
        { email: user.email, remaining: remainingRecoveryCodes, method: "google" },
        { severity: "warning", category: "security", actor: user });
    }
  }

  /*
    A privileged account with no second factor.

    When enforcement is off — the default — this only sets a flag the
    dashboard can act on, and the login proceeds exactly as before. When it is
    on, the account is refused with an answer that says what to do rather than
    just "no".
  */
  const twoFactorRecommended = shouldUseTwoFactor(user) && !user.twoFactorEnabled;
  if (twoFactorRecommended && twoFactorEnforced()) {
    logAudit(req, "auth.login_blocked_no_2fa", "auth", user._id,
      { email: user.email, role: user.role },
      { status: "failure", severity: "warning", category: "security", actor: user });
    return res.status(403).json({
      success: false,
      code: "TWO_FACTOR_REQUIRED_SETUP",
      message:
        "This account needs two-factor authentication before it can sign in. Ask an administrator to enrol it, or turn REQUIRE_ADMIN_2FA off to sign in and enrol yourself.",
    });
  }

  generateTokensAndSetCookies(res, user._id, user.tokenVersion ?? 0);

  logAudit(req, "auth.login", "auth", user._id, { method: "google" }, {
    actor: user,
    category: "security",
  });

  return res.status(200).json({
    success: true,
    message: "Signed in with Google",
    ...(remainingRecoveryCodes !== undefined ? { remainingRecoveryCodes } : {}),
    ...(twoFactorRecommended ? { twoFactorRecommended: true } : {}),
    user: {
      ...user._doc,
      password: undefined,
      totpSecret: undefined,
      twoFactorRecoveryCodes: undefined,
      permissions: await getUserPermissions(user),
      store:
        user.role === "store"
          ? await Store.findOne({ owner: user._id })
          : undefined,
    },
  });
});

export const logout = controllerWrapper("logout", async (req, res) => {
  clearAuthCookies(res);
  if (req.user) {
    logAudit(req, "auth.logout", "auth", req.user._id, {}, { category: "security" });
  }
  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
});

export const refreshToken = controllerWrapper(
  "refreshToken",
  async (req, res) => {
    // This will be called after verifyRefreshToken middleware
    const userId = req.userId;

    // A valid refresh token is not enough on its own — it stays valid for 7
    // days, so without this check a deleted or deactivated account could keep
    // minting fresh sessions for a week after being locked out. (Admin-window
    // expiry is enforced per-request by protectRoute.)
    const user = await User.findById(userId).select("active deleted tokenVersion");
    if (!user || user.deleted || !user.active) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Session is no longer valid. Please log in again.",
      });
    }

    // Generate new access token
    /*
      The refresh cookie is the long-lived one — seven days — so this is the
      endpoint a stolen session actually lives on. A refresh token minted
      before the account's last revocation is refused here rather than being
      exchanged for another five hours of access.
    */
    if ((req.refreshTokenPayload?.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({
        success: false,
        code: "SESSION_REVOKED",
        message: "This session has ended. Please sign in again.",
      });
    }

    const newAccessToken = generateToken(userId, "5h", user.tokenVersion ?? 0);

    res.cookie("accessToken", newAccessToken, {
      ...authCookieOptions(),
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
  },
);

export const forgotPassword = controllerWrapper(
  "forgotPassword",
  async (req, res) => {
    const { email } = req.body;
    const genericResponse = {
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    };

    if (typeof email !== "string" || !email.trim()) {
      return res.status(200).json(genericResponse);
    }

    const user = await User.findOne({ email: emailMatch(email.trim()) });

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Only the hash is persisted — a leaked DB snapshot then can't be used to
    // take over accounts. The raw token goes out in the email and nowhere else.
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = hashResetToken(resetToken);
    user.resetPasswordExpiresAt = Date.now() + 1 * 60 * 60 * 1000;
    await user.save();

    sendPasswordResetEmail(user, resetToken).catch((err) =>
      console.error("Failed to send password reset email:", err)
    );

    return res.status(200).json(genericResponse);
  },
);

export const resetPassword = controllerWrapper(
  "resetPassword",
  async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    user.password = password;
    /*
      Every session this account had stops here.

      This is the endpoint somebody reaches when they believe their password
      is in the wrong hands, and until now it changed the password and left
      the attacker's refresh cookie working for the rest of its seven days.
      Resetting a password that has been used against you has to end the
      sessions it opened, or it is not a remedy.
    */
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    // Create password reset notification
    try {
      await Notification.create({
        user: user._id,
        title: "Password Updated",
        message: "Your password has been successfully changed.",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating password reset notification:", error);
    }

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  },
);

export const getAllUsers = controllerWrapper(
  "getAllUsers",
  async (req, res) => {
    const { page, limit, role, staff } = req.query;

    // `role` takes one role or several separated by commas, and `staff=1`
    // asks for the back office as a whole. The team page wants the latter:
    // asking for `admin` by name meant a category manager — a real staff
    // account, just not an administrator — never appeared in the list that
    // exists to manage staff, and so could not be given its categories.
    const roles = String(role || "")
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean);

    const filter = roles.length
      ? { role: roles.length === 1 ? roles[0] : { $in: roles } }
      : staff
        ? { role: { $nin: ["customer", "store"] } }
        : {};

    const query = User.find(filter).select(SENSITIVE_USER_FIELDS);
    const users = await paginateQuery(page, limit, query);
    if (!users.success) return res.status(400).json(users);
    res.status(200).json(users);
  },
);

export const getAllUsersType = controllerWrapper(
  "getAllUsersType",
  async (req, res) => {
    // Read from the query string: this is mounted as a GET, and a GET body is
    // not something browsers/axios send.
    const { page, limit, type } = req.query;
    const query = User.find({ role: type }).select(SENSITIVE_USER_FIELDS);
    const users = await paginateQuery(page, limit, query);
    if (!users.success) return res.status(400).json(users);
    res.status(200).json(users);
  },
);

export const updateUser = controllerWrapper("updateUser", async (req, res) => {
  const { userId } = req.params;
  const updateData = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is required" });
  }

  // Only allow updating role and active status
  const allowedFields = ["role", "active"];
  const filteredData = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }

  if (Object.keys(filteredData).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No valid data provided to update" });
  }

  const guard = await guardSuperAdminMutation(userId, req.user);
  if (guard.status) return res.status(guard.status).json(guard.body);

  const before = guard.targetUser;

  // Role is a privileged field. This endpoint is gated on `users.edit`, which
  // is a weaker permission than the dedicated `users.role` — so re-check it
  // here rather than letting an editor rewrite the access-control graph.
  if (filteredData.role !== undefined && filteredData.role !== before.role) {
    if (!(await userCan(req.user, "users.role"))) {
      return res.status(403).json({
        success: false,
        message: "Access denied - changing a role requires the users.role permission",
      });
    }
    const wantedRole = normaliseRole(filteredData.role);
    if (PRIVILEGED_ROLES.includes(wantedRole)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change role to ${filteredData.role}`,
      });
    }
    // Write what was checked, not what was sent.
    filteredData.role = wantedRole;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, filteredData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const changes = diff(
    { role: before?.role, active: before?.active },
    { role: updatedUser.role, active: updatedUser.active },
    ["role", "active"]
  );
  logAudit(req, "user.updated", "user", updatedUser._id, {}, {
    target: updatedUser,
    changes,
    severity: changes.some((c) => c.field === "role") ? "critical" : "warning",
    category: "admin",
  });

  return res.status(200).json({ success: true, user: updatedUser });
});

export const safeDeleteUser = controllerWrapper(
  "safeDeleteUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = await User.findByIdAndUpdate(
      userId,
      { deleted: true },
      { new: true },
    );

    logAudit(req, "user.soft_deleted", "user", userId, {}, {
      target: user,
      severity: "critical",
      category: "admin",
    });

    return res
      .status(200)
      .json({ success: true, message: "User marked as deleted" });
  },
);

export const finalDeleteUser = controllerWrapper(
  "finalDeleteUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = await User.findByIdAndDelete(userId);

    logAudit(req, "user.deleted_permanently", "user", userId, {}, {
      target: user,
      severity: "critical",
      category: "admin",
    });

    res
      .status(200)
      .json({ success: true, message: "User permanently deleted" });
  },
);

/**
 * Put an account in charge of part of the catalogue, or all of it.
 *
 * An empty list means unrestricted, which is what an administrator is and
 * what every account was before this existed. Naming a parent category
 * covers everything beneath it, so a person put on Networking does not have
 * to be re-granted each new switch category somebody adds next month.
 *
 * Deliberately separate from changing a role: the role says what an account
 * may do, this says where it may do it, and conflating them would mean a new
 * role for every combination of the two.
 */
/**
 * Create a back-office account outright.
 *
 * Staff are not customers who happened to sign up. Without this the only way
 * to put somebody in charge of a section was to have them register on the
 * storefront, wait for the verification mail, then find the row and promote
 * it — three steps across two people, and the account carried a cart and a
 * referral code it would never use.
 *
 * The account is created verified and active: an administrator vouching for
 * a colleague is the verification, and a staff member who cannot log in
 * until they click a link in an inbox nobody has set up yet is no account at
 * all. `categoryScope` may be passed here so the two decisions — who they
 * are and what they are responsible for — are made in one go.
 *
 * Gated on `users.role`, the same permission as changing one, because
 * creating an account with a role is granting that role. Administrator roles
 * stay off-limits: PRIVILEGED_ROLES is what stops this endpoint from being a
 * way to mint a super admin.
 */
export const createStaffAccount = controllerWrapper(
  "createStaffAccount",
  async (req, res) => {
    const { name, email, password, role, categoryScope = [] } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "name, email, password and role are all required",
      });
    }

    if (String(password).length < 8) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 8 characters" });
    }

    const wanted = String(role).toLowerCase().trim();
    if (PRIVILEGED_ROLES.includes(wanted)) {
      return res
        .status(400)
        .json({ success: false, message: `Cannot create an account with the ${role} role` });
    }

    const roleExists = await Role.exists({ key: wanted });
    if (!roleExists) {
      return res.status(400).json({ success: false, message: `No such role: ${role}` });
    }

    if (await User.findOne({ email: emailMatch(email) })) {
      return res
        .status(409)
        .json({ success: false, message: "An account with that email already exists" });
    }

    if (!Array.isArray(categoryScope)) {
      return res
        .status(400)
        .json({ success: false, message: "categoryScope must be an array of category ids" });
    }
    const ids = categoryScope.map(String).filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (ids.length !== categoryScope.length) {
      return res
        .status(400)
        .json({ success: false, message: "One of the category ids is not a valid id" });
    }
    if (ids.length && (await Category.countDocuments({ _id: { $in: ids } })) !== ids.length) {
      return res
        .status(400)
        .json({ success: false, message: "One of the categories does not exist" });
    }

    // The pre-save hook hashes the password; it never reaches the database
    // as written, and never comes back out — SENSITIVE_USER_FIELDS drops it
    // from every read, and the response below is built by hand.
    const user = new User({
      name,
      email,
      password,
      role: wanted,
      categoryScope: ids,
      isVerified: true,
      active: true,
      lastLogin: new Date(),
    });
    await user.save();

    logAudit(
      req,
      "user.staff_created",
      "user",
      user._id,
      { email: user.email, role: wanted, categoryScope: ids },
      { target: user, severity: "warning", category: "account" },
    );

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        categoryScope: ids,
      },
    });
  },
);

export const setCategoryScope = controllerWrapper(
  "setCategoryScope",
  async (req, res) => {
    const { userId } = req.params;
    const { categoryScope } = req.body;

    if (!Array.isArray(categoryScope)) {
      return res
        .status(400)
        .json({ success: false, message: "categoryScope must be an array of category ids" });
    }

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);
    const user = guard.targetUser;

    const ids = categoryScope.map(String).filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (ids.length !== categoryScope.length) {
      return res
        .status(400)
        .json({ success: false, message: "One of the category ids is not a valid id" });
    }

    const found = await Category.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) {
      return res
        .status(400)
        .json({ success: false, message: "One of the categories does not exist" });
    }

    const before = (user.categoryScope || []).map(String);
    user.categoryScope = ids;
    await user.save();

    logAudit(req, "user.category_scope_changed", "user", user._id, { before, after: ids }, {
      target: user,
      severity: "warning",
    });

    res.json({ success: true, categoryScope: ids });
  },
);
export const changeUserRole = controllerWrapper(
  "changeUserRole",
  async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const wantedRole = normaliseRole(role);
  if (PRIVILEGED_ROLES.includes(wantedRole))
    return res.status(400).json({ message: `Cannot change role to ${role}` });
  if (!userId || !role)
      return res.status(400).json({ message: "User ID and role are required" });

  const guard = await guardSuperAdminMutation(userId, req.user);
  if (guard.status) return res.status(guard.status).json(guard.body);

  const user = guard.targetUser;

  const previousRole = user.role;
  user.role = wantedRole;
  await user.save();

    logAudit(req, "user.role_changed", "user", user._id, {}, {
      target: user,
      changes: [{ field: "role", from: previousRole, to: role }],
      severity: "critical",
      category: "admin",
    });

    res.status(200).json({ message: "User role updated successfully" });
  },
);

export const setAdminTime = controllerWrapper(
  "setAdminTime",
  async (req, res) => {
    const { userId } = req.params;
    const { days = 0, hours = 0, minutes = 0 } = req.body;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });
    if (days <= 0 && hours <= 0 && minutes <= 0)
      return res
        .status(400)
        .json({ message: "Provide a positive duration in days, hours or minutes" });

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role !== "admin")
      return res
        .status(400)
        .json({ message: "Target user must be an admin" });

    const now = Date.now();
    const durationMs =
      Number(days) * 24 * 60 * 60 * 1000 +
      Number(hours) * 60 * 60 * 1000 +
      Number(minutes) * 60 * 1000;
    target.adminExpiresAt = new Date(now + durationMs);
    target.adminGrantedBy = req.user._id;
    await target.save();

    logAudit(req, "user.admin_granted", "user", target._id, {
      days: Number(days),
      hours: Number(hours),
      minutes: Number(minutes),
      expiresAt: target.adminExpiresAt,
    }, { target, severity: "critical", category: "security" });

    res.status(200).json({
      success: true,
      message: "Admin time window updated",
      user: target,
    });
  }
);

export const endAdminTimeNow = controllerWrapper(
  "endAdminTimeNow",
  async (req, res) => {
    const { userId } = req.params;
    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.role !== "admin")
      return res
        .status(400)
        .json({ message: "Target user must be an admin" });

    target.adminExpiresAt = new Date(Date.now() - 1000);
    target.adminGrantedBy = req.user._id;
    await target.save();

    logAudit(req, "user.admin_revoked", "user", target._id, {}, {
      target,
      severity: "critical",
      category: "security",
    });

    res.status(200).json({ success: true, message: "Admin access ended now" });
  }
);

export const activateUser = controllerWrapper(
  "activateUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = guard.targetUser;

    user.active = true; // Assuming you have an isActive field
    await user.save();

    logAudit(req, "user.activated", "user", user._id, {}, {
      target: user,
      changes: [{ field: "active", from: false, to: true }],
      severity: "warning",
      category: "admin",
    });

    res.status(200).json({ message: "User activated successfully" });
  },
);

export const deActivateUser = controllerWrapper(
  "deActivateUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = guard.targetUser;

    user.active = false; // Assuming you have an isActive field
    await user.save();

    logAudit(req, "user.deactivated", "user", user._id, {}, {
      target: user,
      changes: [{ field: "active", from: true, to: false }],
      severity: "warning",
      category: "admin",
    });

    res.status(200).json({ message: "User deactivated successfully" });
  },
);

export const restoreUser = controllerWrapper(
  "restoreUser",
  async (req, res) => {
    const { userId } = req.params;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const guard = await guardSuperAdminMutation(userId, req.user);
    if (guard.status) return res.status(guard.status).json(guard.body);

    const user = guard.targetUser;

    user.deleted = false; // Assuming you have a deleted field
    await user.save();

    logAudit(req, "user.restored", "user", user._id, {}, {
      target: user,
      changes: [{ field: "deleted", from: true, to: false }],
      severity: "warning",
      category: "admin",
    });

    res.status(200).json({ message: "User restored successfully" });
  },
);
export const getDeletedUsers = controllerWrapper(
  "getDeletedUsers",
  async (req, res) => {
    // use pagination by paginateQuery
    const { page, limit } = req.query;
    const query = User.find({ deleted: true }).select(SENSITIVE_USER_FIELDS);
    const users = await paginateQuery(page, limit, query);
    if (!users.success) return res.status(400).json(users);
    res.status(200).json(users);
  },
);

// make the product love by user
export const loveProduct = controllerWrapper(
  "loveProduct",
  async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // Check if product exists
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Atomic update to prevent race conditions
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        love: { $ne: productId }, // Only update if not already loved
      },
      { $addToSet: { love: productId } }, // $addToSet prevents duplicates
      { new: true },
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Product already in favorites or user not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product added to favorites",
      user: {
        ...user._doc,
        password: undefined,
        store:
          user.role === "store"
            ? await Store.findOne({ owner: user._id })
            : undefined,
      },
    });
  },
);
export const toggleLoveProduct = controllerWrapper(
  "toggleLoveProduct",
  async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // Check if product exists
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Compare as strings — `user.love` stores ObjectIds, productId arrives
    // as a string from req.params, and Array.indexOf uses strict equality,
    // so the naive comparison never matched and toggle always re-added.
    const existing = await User.findById(userId).select("love");
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const isLoved = existing.love.some((id) => id.toString() === productId);

    const update = isLoved
      ? { $pull: { love: productId } }
      : { $addToSet: { love: productId } };
    const message = isLoved
      ? "Product removed from favorites"
      : "Product added to favorites";

    const user = await User.findByIdAndUpdate(userId, update, { new: true });

    return res.status(200).json({
      success: true,
      message,
      user: {
        ...user._doc,
        password: undefined,
        store:
          user.role === "store"
            ? await Store.findOne({ owner: user._id })
            : undefined,
      },
    });
  },
);

export const getLovedProducts = controllerWrapper(
  "getLovedProducts",
  async (req, res) => {
    const userId = req.user._id;
    const user = await User.findOne({ _id: userId }).populate("love");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      love: user.love, // Return the loved products
    });
  },
);

export const getProfile = controllerWrapper("getProfile", async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).populate("love");
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Include store data for store users
  const userData = {
    ...user._doc,
    password: undefined,
    permissions: await getUserPermissions(user),
    store:
      user.role === "store"
        ? await Store.findOne({ owner: user._id })
        : undefined,
  };

  res.status(200).json({
    success: true,
    user: userData,
  });
});

export const changePassword = controllerWrapper(
  "changePassword",
  async (req, res) => {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if current password is correct
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      logAudit(req, "user.password_change_failed", "user", user._id, {
        reason: "bad_current_password",
      }, { target: user, status: "failure", severity: "warning", category: "security" });
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    // Same as the reset above: changing a password ends the sessions the old
    // one opened, including on any device the person no longer has.
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    logAudit(req, "user.password_changed", "user", user._id, {}, {
      target: user,
      severity: "warning",
      category: "security",
    });

    // Create password change notification
    try {
      await Notification.create({
        user: user._id,
        title: "Password Updated",
        message: "Your password has been successfully changed.",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating password change notification:", error);
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  },
);

export const updateProfile = controllerWrapper(
  "updateProfile",
  async (req, res) => {
    const userId = req.user._id;
    const { name, phoneNumber, profilePicture } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const beforeProfile = {
      name: user.name,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
    };

    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    logAudit(req, "user.profile_updated", "user", user._id, {}, {
      target: user,
      changes: diff(
        beforeProfile,
        {
          name: user.name,
          phoneNumber: user.phoneNumber,
          profilePicture: user.profilePicture,
        },
        ["name", "phoneNumber", "profilePicture"]
      ),
      category: "account",
    });

    // Create profile update notification
    try {
      await Notification.create({
        user: user._id,
        title: "Profile Updated",
        message: "Your profile has been successfully updated.",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating profile update notification:", error);
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  },
);

// ── TOTP 2FA ───────────────────────────────────────────────────────────
// Flow:
//   1. Authenticated user calls POST /users/2fa/setup -> we generate a
//      fresh secret, store it (but leave twoFactorEnabled=false), and
//      return a QR code data URL + the base32 secret for manual entry.
//   2. User scans QR with Google Authenticator (or similar), then POSTs
//      the 6-digit code to /users/2fa/enable. On verify success we flip
//      twoFactorEnabled=true.
//   3. To disable, user POSTs current password + current TOTP code to
//      /users/2fa/disable.

export const setup2FA = controllerWrapper("setup2FA", async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).select("+totpSecret +twoFactorRecoveryCodes");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  if (user.twoFactorEnabled) {
    return res.status(400).json({
      success: false,
      message: "Two-factor authentication is already enabled. Disable it first to reset.",
    });
  }

  const { generateTOTPSecret, buildOtpAuthUrl, buildQRCodeDataUrl } =
    await import("../utils/totp.js");

  const secret = generateTOTPSecret();
  user.totpSecret = secret;
  await user.save();

  const otpauthUrl = buildOtpAuthUrl(secret, user.email);
  const qrCodeDataUrl = await buildQRCodeDataUrl(otpauthUrl);

  return res.status(200).json({
    success: true,
    message: "Scan the QR code with your authenticator app, then submit the 6-digit code to /2fa/enable.",
    qrCodeDataUrl,
    secret, // Shown for manual entry; never returned again after enable.
  });
});

export const enable2FA = controllerWrapper("enable2FA", async (req, res) => {
  const userId = req.user._id;
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: "Code is required" });
  }
  const user = await User.findById(userId).select("+totpSecret +twoFactorRecoveryCodes");
  if (!user || !user.totpSecret) {
    return res.status(400).json({
      success: false,
      message: "No 2FA setup in progress. Call /2fa/setup first.",
    });
  }
  const { verifyTOTP } = await import("../utils/totp.js");
  if (!verifyTOTP(user.totpSecret, code)) {
    return res.status(400).json({ success: false, message: "Invalid code" });
  }

  /*
    Recovery codes are issued here and nowhere else in the enrolment flow,
    because here is the only moment we know the authenticator actually works.
    Issuing them at /2fa/setup would hand out ten ways into an account that has
    not yet produced a single valid code.

    Returned in plaintext exactly once. Only hashes are stored, so this
    response cannot be reconstructed from the database afterwards — if the
    person closes the tab without saving them, the way back is
    /2fa/recovery-codes, which costs a password and a live code.
  */
  const { generateRecoveryCodes } = await import("../utils/recoveryCodes.js");
  const { plain, records } = generateRecoveryCodes();
  user.twoFactorRecoveryCodes = records;
  user.twoFactorEnabled = true;
  await user.save();
  logAudit(req, "user.2fa_enabled", "user", user._id, {}, {
    target: user,
    severity: "warning",
    category: "security",
  });
  return res.status(200).json({
    success: true,
    message: "Two-factor authentication enabled.",
    recoveryCodes: plain,
    recoveryCodesNotice:
      "Save these somewhere safe. Each one signs you in once if you lose your authenticator app, and they are not shown again.",
  });
});

/**
 * A fresh set of recovery codes, replacing whatever is there.
 *
 * Costs a password and a live authenticator code — the same price as turning
 * 2FA off — because a stranger at an unlocked laptop who could mint new codes
 * would keep a way back in long after the laptop was locked again.
 *
 * Replaces rather than appends: someone asking for new codes has usually lost
 * track of the old ones, and leaving those live would defeat the request.
 */
export const regenerateRecoveryCodes = controllerWrapper(
  "regenerateRecoveryCodes",
  async (req, res) => {
    const { password, code } = req.body;
    if (!password || !code) {
      return res.status(400).json({
        success: false,
        message: "Current password and current authenticator code are both required.",
      });
    }
    const user = await User.findById(req.user._id).select(
      "+password +totpSecret +twoFactorRecoveryCodes"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "Two-factor authentication is not enabled on this account.",
      });
    }
    if (!(await user.comparePassword(password))) {
      return res.status(400).json({ success: false, message: "Invalid password" });
    }
    const { verifyTOTP } = await import("../utils/totp.js");
    if (!verifyTOTP(user.totpSecret, code)) {
      return res.status(400).json({ success: false, message: "Invalid code" });
    }

    const { generateRecoveryCodes } = await import("../utils/recoveryCodes.js");
    const { plain, records } = generateRecoveryCodes();
    user.twoFactorRecoveryCodes = records;
    await user.save();
    logAudit(req, "user.2fa_recovery_regenerated", "user", user._id, {}, {
      target: user,
      severity: "warning",
      category: "security",
    });
    return res.status(200).json({
      success: true,
      message: "New recovery codes issued. The previous set no longer works.",
      recoveryCodes: plain,
    });
  }
);

export const disable2FA = controllerWrapper("disable2FA", async (req, res) => {
  const userId = req.user._id;
  const { password, code } = req.body;
  if (!password || !code) {
    return res.status(400).json({
      success: false,
      message: "Current password and current authenticator code are both required.",
    });
  }
  const user = await User.findById(userId).select("+totpSecret +twoFactorRecoveryCodes");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    return res.status(400).json({ success: false, message: "Invalid password" });
  }
  const { verifyTOTP } = await import("../utils/totp.js");
  if (!verifyTOTP(user.totpSecret, code)) {
    return res.status(400).json({ success: false, message: "Invalid code" });
  }
  user.twoFactorEnabled = false;
  user.totpSecret = undefined;
  // Turning the second factor off is a downgrade in how well this account is
  // protected, so the sessions opened while it was on do not carry over.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  // The codes exist to stand in for the secret, so they die with it. Leaving
  // them behind would mean a printout still opened an account whose owner
  // believes they have turned the second factor off.
  user.twoFactorRecoveryCodes = [];
  await user.save();
  logAudit(req, "user.2fa_disabled", "user", user._id, {}, {
    target: user,
    severity: "warning",
    category: "security",
  });
  return res.status(200).json({
    success: true,
    message: "Two-factor authentication disabled.",
  });
});

// ── GDPR: export all personal data ──────────────────────────────────────────
export const exportMyData = controllerWrapper("exportMyData", async (req, res) => {
  const userId = req.user._id;

  const [user, orders, addresses, notifications, notifPrefs] = await Promise.all([
    User.findById(userId)
      .select("-password -resetPasswordToken -verificationToken -totpSecret -pushSubscriptions")
      .lean(),
    mongoose.model("Order").find({ user: userId }).lean(),
    mongoose.model("Address").find({ user: userId }).lean(),
    mongoose.model("Notification").find({ user: userId, deleted: false }).lean(),
    mongoose.model("NotificationPreferences").findOne({ user: userId }).lean(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: user,
    orders,
    addresses,
    notifications,
    notificationPreferences: notifPrefs,
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="belgomla-data-${userId}.json"`
  );
  res.status(200).json(payload);
});

// ── GDPR: self-service account deletion ─────────────────────────────────────
export const deleteMyAccount = controllerWrapper("deleteMyAccount", async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required to confirm deletion" });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    return res.status(400).json({ success: false, message: "Incorrect password" });
  }

  const ts = Date.now();
  /*
    Anonymise all PII — keep the document so relational data stays intact.

    `$unset` rather than `undefined`. Mongoose drops undefined keys when it
    casts an update, so the previous version of this sent Mongo nothing but
    `{email, name, cart, love, pushSubscriptions, deleted, active}` and the
    phone number, profile picture, Google id and referral code all survived a
    deletion whose own comment says it removes them.

    The Google id mattered twice over: it stayed matchable, so the person's
    next "Sign in with Google" found the dead row, was issued cookies, and
    then got 403 on every request — with no way to make a fresh account for
    that identity either.
  */
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      email: `deleted_${ts}@deleted.invalid`,
      name: "Deleted User",
      cart: [],
      love: [],
      pushSubscriptions: [],
      deleted: true,
      active: false,
      // Ends every session this account had open.
      tokenVersion: (user.tokenVersion ?? 0) + 1,
    },
    $unset: {
      phoneNumber: 1,
      profilePicture: 1,
      googleId: 1,
      referralCode: 1,
      totpSecret: 1,
      twoFactorRecoveryCodes: 1,
    },
  });

  // Cancel any open orders so stock is not held indefinitely.
  await mongoose.model("Order").updateMany(
    { user: req.user._id, status: { $in: ["pending", "confirmed", "processing"] } },
    { status: "cancelled", cancelled: true }
  );

  logAudit(req, "user.self_deleted", "user", req.user._id, {}, {
    target: req.user,
    severity: "critical",
    category: "account",
  });

  // Clear auth cookies.
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.status(200).json({ success: true, message: "Account deleted." });
});
