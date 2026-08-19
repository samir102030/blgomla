import crypto from "crypto";
import mongoose from "mongoose";

import Coupon from "../models/coupon.model.js";
import StudentProfile from "../models/studentProfile.model.js";
import StudentProgram from "../models/studentProgram.model.js";
import User from "../models/user.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { sendStudentDiscountEmail, sendStudentVerificationEmail } from "../utils/email.js";

/**
 * The university student programme.
 *
 * A student proves enrolment by holding a faculty mailbox, and is paid in a
 * personal coupon rather than a price rule: the coupon machinery already knows
 * how to cap a discount, scope it to categories, and count redemptions, and
 * reusing it means the student discount shows up in the same reports as every
 * other discount instead of in a private ledger nobody reconciles.
 *
 * Two things here are deliberate and worth not "simplifying" later:
 *
 * 1. The scope is an audience, not a list of departments. The section has its
 *    own catalogue, so "what the code pays for" is "the student shelf" —
 *    listing department ids instead would freeze the answer at the moment the
 *    code was minted, and every code issued before a department existed would
 *    quietly refuse to pay for it.
 *
 * 2. The verification link is proof of nothing but the mailbox. It therefore
 *    does not require a session — the student may well open it in a browser
 *    that has never logged in — and the account it belongs to is read from the
 *    profile the token was minted for.
 */

const VERIFY_TTL_MINUTES = 60;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/* ─────────────────────────── helpers ─────────────────────────── */

const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const fail = (res, status, message) => res.status(status).json({ success: false, message });

/**
 * One mailbox, one address.
 *
 * Sub-addressing means `sara+1@`, `sara+2@` and `sara@` all land in the same
 * inbox, so without this a single student could hold as many memberships as
 * they had patience for — each one a fresh code, each one passing verification
 * honestly. The tag is dropped before the address is stored or compared.
 */
const normalizeUniversityEmail = (raw) => {
  const value = String(raw || "").toLowerCase().trim();
  const at = value.lastIndexOf("@");
  if (at < 1) return value;
  const local = value.slice(0, at).split("+")[0];
  return `${local}${value.slice(at)}`;
};

/** `STU-XXXXXX`, checked against the global unique index before it is used. */
const mintCouponCode = async () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `STU-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    if (!(await Coupon.exists({ code }))) return code;
  }
  throw new Error("Could not allocate a unique student coupon code");
};


/** Human-readable terms for the email, built from the live settings. */
const describeTerms = (program, expiresAt) => {
  const d = program.discount || {};
  const amount = d.type === "fixed" ? `${d.value} EGP` : `${d.value}%`;
  const amountAr = d.type === "fixed" ? `${d.value} جنيه` : `${d.value}%`;
  const cap = d.maximumDiscount ? ` (up to ${d.maximumDiscount} EGP)` : "";
  const capAr = d.maximumDiscount ? ` (بحد أقصى ${d.maximumDiscount} جنيه)` : "";
  const min = d.minimumPurchase ? ` on orders over ${d.minimumPurchase} EGP` : "";
  const minAr = d.minimumPurchase ? ` على الطلبات فوق ${d.minimumPurchase} جنيه` : "";
  const uses = program.renewal?.usesPerPeriod ?? 1;
  const days = program.renewal?.periodDays ?? 30;

  return {
    discountEN: `${amount} off${cap}${min}.`,
    discountAR: `خصم ${amountAr}${capAr}${minAr}.`,
    scopeEN: "Valid on everything in the student section.",
    scopeAR: "صالح على كل اللي في قسم الطلاب.",
    renewalEN: `Good for ${uses} order${uses === 1 ? "" : "s"} every ${days} days — it renews, it does not burn out.`,
    renewalAR: `يكفي ${uses} ${uses === 1 ? "طلب" : "طلبات"} كل ${days} يوم — يتجدد ولا ينتهي بعد أول استخدام.`,
    expiryEN: expiresAt ? `Membership runs until ${new Date(expiresAt).toISOString().slice(0, 10)}.` : "",
    expiryAR: expiresAt ? `العضوية سارية حتى ${new Date(expiresAt).toISOString().slice(0, 10)}.` : "",
  };
};

/**
 * Roll the renewal window forward when it has elapsed.
 *
 * The coupon holds the hard limit for one window; this is what makes the next
 * window start. Called wherever a student's status is read, so the code is
 * already usable by the time they look at it, and again from the cron for the
 * students who never open the page.
 */
export const rollRenewalWindow = async (profile, program) => {
  if (!profile?.coupon || profile.status !== "verified") return false;
  const days = program?.renewal?.periodDays ?? 30;
  const started = profile.periodStartedAt ? new Date(profile.periodStartedAt).getTime() : 0;
  if (!started || Date.now() - started < days * 24 * 60 * 60 * 1000) return false;

  await Coupon.findByIdAndUpdate(profile.coupon, { usageCount: 0 });
  profile.periodStartedAt = new Date();
  await profile.save();
  return true;
};

/**
 * Create — or refresh — the personal coupon behind a verified membership.
 *
 * Refreshing is deliberately not the same as issuing. A refresh re-reads the
 * terms an admin may have changed (rate, cap, scope) and reactivates the code,
 * but it does NOT touch `usageCount`, `startDate` or `endDate`, because every
 * path that refreshes is a path the member can walk on demand: re-confirming
 * an address, moving faculty, an admin re-approving. Resetting the counter
 * there hands out an extra order for the asking, and pushing `endDate` out
 * renews the term for free — between them they make the advertised "N orders
 * every M days" and the membership length unenforceable.
 *
 * The counter is reset in exactly one place: `rollRenewalWindow`, when the
 * period has actually elapsed.
 */
const issueCoupon = async (profile, program) => {
  const expiresAt =
    profile.expiresAt || new Date(Date.now() + (program.membershipDays ?? 365) * 24 * 60 * 60 * 1000);

  // Terms, scope and state that should follow the settings wherever they are.
  const terms = {
    description: `Student programme — ${profile.university || profile.domain}`,
    discountType: program.discount?.type ?? "percentage",
    discountValue: program.discount?.value ?? 0,
    minimumPurchase: program.discount?.minimumPurchase ?? 0,
    maximumDiscount: program.discount?.maximumDiscount,
    usageLimit: program.renewal?.usesPerPeriod ?? 1,
    isActive: true,
    // Never advertised on the storefront strip — it belongs to one person.
    isPublic: false,
    // The student shelf, whatever is on it today. Naming the audience rather
    // than listing departments means a code minted in September still covers
    // a department added in March, without rewriting every live coupon.
    applicableAudience: "students",
    applicableCategories: [],
    applicableProducts: [],
    assignedUser: profile.user,
  };

  if (profile.coupon) {
    const updated = await Coupon.findByIdAndUpdate(profile.coupon, terms, { new: true });
    if (updated) return updated;
  }

  return Coupon.create({
    ...terms,
    code: await mintCouponCode(),
    startDate: new Date(),
    endDate: expiresAt,
    usageCount: 0,
    createdBy: profile.user,
  });
};

/* ─────────────────────── student-facing ─────────────────────── */

/** What the portal page needs before anyone has signed in. */
export const getPublicProgram = controllerWrapper("getPublicProgram", async (req, res) => {
  const program = await StudentProgram.load();
  const universities = [
    ...new Map(
      program.domains
        .filter((d) => d.active)
        .map((d) => [d.university || d.domain, { university: d.university, universityAr: d.universityAr, faculty: d.faculty }]),
    ).values(),
  ];

  return ok(res, {
    program: {
      enabled: program.enabled,
      discount: program.discount,
      renewal: program.renewal,
      membershipDays: program.membershipDays,
      universities,
      // The domains themselves are public: a student needs to know whether
      // their faculty address will be accepted before they type it in.
      domains: program.domains.filter((d) => d.active).map((d) => d.domain),
    },
  });
});

/** The signed-in student's own membership. */
export const getMyStudentProfile = controllerWrapper("getMyStudentProfile", async (req, res) => {
  const program = await StudentProgram.load();
  const profile = await StudentProfile.findOne({ user: req.user._id }).populate("coupon");
  if (!profile) return ok(res, { profile: null });

  await rollRenewalWindow(profile, program);
  const coupon = profile.coupon ? await Coupon.findById(profile.coupon._id || profile.coupon) : null;

  return ok(res, {
    profile: {
      _id: profile._id,
      universityEmail: profile.universityEmail,
      university: profile.university,
      faculty: profile.faculty,
      status: profile.status,
      rejectionReason: profile.rejectionReason,
      verifiedAt: profile.verifiedAt,
      expiresAt: profile.expiresAt,
      periodStartedAt: profile.periodStartedAt,
      code: coupon && profile.status === "verified" ? coupon.code : null,
      usesLeft: coupon ? Math.max(0, (coupon.usageLimit ?? 0) - (coupon.usageCount ?? 0)) : 0,
      usesPerPeriod: program.renewal?.usesPerPeriod ?? 1,
      periodDays: program.renewal?.periodDays ?? 30,
    },
  });
});

/**
 * Apply with a university address.
 *
 * Re-applying is allowed and is the same call: a student who mistyped the
 * address, or who moved faculty, should not be stuck with the first attempt.
 */
export const applyForStudentProgram = controllerWrapper("applyForStudentProgram", async (req, res) => {
  const program = await StudentProgram.load();
  if (!program.enabled) return fail(res, 403, "The student programme is not open at the moment.");

  const universityEmail = normalizeUniversityEmail(req.body?.universityEmail);
  if (!universityEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(universityEmail)) {
    return fail(res, 400, "Enter a valid university email address.");
  }

  const match = program.matchDomain(universityEmail);
  if (!match) {
    return fail(
      res,
      422,
      "That domain is not on the approved list. The programme is open to engineering and computer science faculty addresses.",
    );
  }

  // One university address per person, and one person per university address.
  const takenByOther = await StudentProfile.findOne({
    universityEmail,
    user: { $ne: req.user._id },
  });
  if (takenByOther) return fail(res, 409, "That university email is already registered to another account.");

  let profile = await StudentProfile.findOne({ user: req.user._id });

  // A decision an admin made is not undone by the applicant re-submitting.
  // Without this, rejecting a membership meant nothing: the student applied
  // again, verified, and was back in.
  if (profile && (profile.status === "suspended" || profile.status === "rejected")) {
    return fail(
      res,
      403,
      "This membership is not active. Contact support if you think that is a mistake.",
    );
  }

  // Already in, same address, nothing to prove. Re-issuing here is what let a
  // member loop apply → confirm → apply to reset their own usage counter and
  // push the expiry out, which is an unlimited discount with extra steps.
  if (profile && profile.status === "verified" && profile.universityEmail === universityEmail) {
    return ok(res, {
      message: "You are already verified — your code is on the programme page.",
      status: profile.status,
    });
  }

  if (!profile) profile = new StudentProfile({ user: req.user._id, universityEmail });

  // Per account, not per address. Keying the cooldown to the address meant a
  // signed-in shopper could walk a list of mailboxes on an approved faculty
  // domain — a different address every call, so the cooldown never matched —
  // and have the store mail every one of them. The ceiling was the global
  // per-IP limiter, i.e. roughly a thousand unsolicited messages a quarter
  // hour, sent from the shop's own sending domain.
  if (
    profile?.verificationSentAt &&
    Date.now() - new Date(profile.verificationSentAt).getTime() < RESEND_COOLDOWN_MS
  ) {
    return fail(res, 429, "A confirmation link was just sent. Check the inbox, then try again in a couple of minutes.");
  }

  // Read before the overwrite. Comparing `profile.universityEmail` after
  // assigning it compares the value to itself, which quietly lets a verified
  // member point their membership at a different mailbox and stay verified
  // without ever proving they hold it.
  const previousEmail = profile.universityEmail;
  const wasVerified = profile.status === "verified";
  const addressChanged = previousEmail !== universityEmail;

  profile.universityEmail = universityEmail;
  profile.domain = match.domain;
  profile.university = match.university;
  profile.faculty = match.faculty;

  // A verified member who re-applies with the same address keeps their code —
  // a stray click should not cost them anything. A different address is a new
  // claim and has to be proved, so the membership drops back to pending and
  // the code stops working until it is.
  if (!wasVerified || addressChanged) {
    profile.status = "pending";
    profile.rejectionReason = undefined;
    if (wasVerified && addressChanged && profile.coupon) {
      await Coupon.findByIdAndUpdate(profile.coupon, { isActive: false });
    }
  }

  const token = profile.issueVerificationToken(VERIFY_TTL_MINUTES);
  await profile.save();

  // Everywhere else in the shop a message that fails to send is a nuisance —
  // the order still exists, the receipt can be re-sent. Here the message is
  // the entire product: without the link there is no way to finish. So the
  // send is checked, and a failure is reported as one rather than answered
  // with "check your inbox".
  //
  // Clearing the stamp releases the two-minute cooldown at the same time.
  // Being told to wait for a message that was never dispatched is the worst
  // of both, and the send never happened, so there is nothing to throttle.
  const sent = await sendStudentVerificationEmail(
    req.user,
    profile,
    token,
    process.env.CLIENT_URL,
  );
  if (!sent) {
    profile.verificationSentAt = undefined;
    await profile.save();
    return fail(
      res,
      502,
      "We could not send the confirmation link just now. Try again in a moment, or contact support.",
    );
  }

  return ok(res, {
    message: "Check your university inbox for the confirmation link.",
    status: profile.status,
  });
});

/**
 * Confirm the mailbox and hand over the code.
 *
 * Deliberately unauthenticated: the token is the proof, and the link is opened
 * from a university webmail that may be signed into nothing.
 */
export const verifyStudentEmail = controllerWrapper("verifyStudentEmail", async (req, res) => {
  const token = String(req.body?.token || req.params?.token || "").trim();
  if (!token) return fail(res, 400, "Missing confirmation token.");

  const profile = await StudentProfile.findOne({
    verificationTokenHash: StudentProfile.hashToken(token),
    verificationTokenExpiresAt: { $gt: new Date() },
  }).select("+verificationTokenHash");

  if (!profile) return fail(res, 400, "This confirmation link is invalid or has expired. Request a new one.");
  if (profile.status === "suspended" || profile.status === "rejected") {
    return fail(res, 403, "This membership is not active.");
  }

  const program = await StudentProgram.load();

  // The link was minted while the programme was open and the faculty was on
  // the list. Both can have changed since — a closed programme that still
  // admits everyone holding an old link is not closed.
  if (!program.enabled) {
    return fail(res, 403, "The student programme is not open at the moment.");
  }
  if (!program.matchDomain(profile.universityEmail)) {
    return fail(res, 403, "This faculty is no longer part of the programme.");
  }

  const user = await User.findById(profile.user);
  if (!user) return fail(res, 404, "The account behind this application no longer exists.");

  // A membership that already has a code is being re-proved, not started.
  // Keyed on the coupon rather than on `status`, because the status is exactly
  // what a member can flip back to "pending" on demand — applying with a second
  // address on the same approved faculty domain did it, and that reset the
  // counter and pushed the term out every time, without limit.
  const isNewMembership = !profile.coupon;

  profile.status = "verified";
  profile.verifiedAt = profile.verifiedAt || new Date();
  profile.verificationTokenHash = undefined;
  profile.verificationTokenExpiresAt = undefined;

  if (isNewMembership) {
    profile.expiresAt = new Date(Date.now() + (program.membershipDays ?? 365) * 24 * 60 * 60 * 1000);
    profile.periodStartedAt = new Date();
  }

  const coupon = await issueCoupon(profile, program);
  profile.coupon = coupon._id;
  await profile.save();

  await sendStudentDiscountEmail(user, profile, coupon, describeTerms(program, profile.expiresAt));

  return ok(res, {
    message: "Your university email is confirmed and your code is on its way.",
    code: coupon.code,
  });
});

/* ────────────────────────── admin side ────────────────────────── */

export const getProgramSettings = controllerWrapper("getProgramSettings", async (req, res) => {
  const program = await StudentProgram.load();
  return ok(res, { program });
});

export const updateProgramSettings = controllerWrapper("updateProgramSettings", async (req, res) => {
  const program = await StudentProgram.load();
  const { enabled, discount, renewal, membershipDays } = req.body || {};

  if (typeof enabled === "boolean") program.enabled = enabled;
  if (discount && typeof discount === "object") {
    if (discount.type) program.discount.type = discount.type;
    if (discount.value !== undefined) program.discount.value = discount.value;
    program.discount.maximumDiscount = discount.maximumDiscount ?? undefined;
    if (discount.minimumPurchase !== undefined) program.discount.minimumPurchase = discount.minimumPurchase;
  }
  if (renewal && typeof renewal === "object") {
    if (renewal.usesPerPeriod !== undefined) program.renewal.usesPerPeriod = renewal.usesPerPeriod;
    if (renewal.periodDays !== undefined) program.renewal.periodDays = renewal.periodDays;
  }
  if (membershipDays !== undefined) program.membershipDays = membershipDays;
  program.updatedBy = req.user._id;

  await program.save();
  return ok(res, { program, message: "Programme settings saved." });
});

export const addProgramDomain = controllerWrapper("addProgramDomain", async (req, res) => {
  const program = await StudentProgram.load();
  const domain = String(req.body?.domain || "").toLowerCase().trim().replace(/^@/, "");
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return fail(res, 400, "Enter a valid mail domain, for example eng.cu.edu.eg");
  }
  if (program.domains.some((d) => d.domain === domain)) {
    return fail(res, 409, "That domain is already on the list.");
  }

  program.domains.push({
    domain,
    university: req.body?.university,
    universityAr: req.body?.universityAr,
    faculty: req.body?.faculty || "engineering",
    active: req.body?.active !== false,
  });
  program.updatedBy = req.user._id;
  await program.save();
  return ok(res, { program, message: "Domain added." }, 201);
});

export const updateProgramDomain = controllerWrapper("updateProgramDomain", async (req, res) => {
  const program = await StudentProgram.load();
  const entry = program.domains.id(req.params.domainId);
  if (!entry) return fail(res, 404, "Domain not found.");

  if (req.body?.university !== undefined) entry.university = req.body.university;
  if (req.body?.universityAr !== undefined) entry.universityAr = req.body.universityAr;
  if (req.body?.faculty !== undefined) entry.faculty = req.body.faculty;
  if (req.body?.active !== undefined) entry.active = !!req.body.active;
  program.updatedBy = req.user._id;

  await program.save();
  return ok(res, { program, message: "Domain updated." });
});

/**
 * Domains are removed, not soft-deleted: the membership record keeps its own
 * copy of the university and domain, so history survives the list.
 */
export const removeProgramDomain = controllerWrapper("removeProgramDomain", async (req, res) => {
  const program = await StudentProgram.load();
  const entry = program.domains.id(req.params.domainId);
  if (!entry) return fail(res, 404, "Domain not found.");
  entry.deleteOne();
  program.updatedBy = req.user._id;
  await program.save();
  return ok(res, { program, message: "Domain removed." });
});

export const listStudentMembers = controllerWrapper("listStudentMembers", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const query = {};

  if (req.query.status) query.status = req.query.status;
  if (req.query.faculty) query.faculty = req.query.faculty;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ universityEmail: rx }, { university: rx }, { domain: rx }];
  }

  const [members, total] = await Promise.all([
    StudentProfile.find(query)
      .populate("user", "name email phoneNumber")
      .populate("coupon", "code usageCount usageLimit isActive")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    StudentProfile.countDocuments(query),
  ]);

  return ok(res, { members, total, page, pages: Math.ceil(total / limit) || 1, limit });
});

/**
 * Approve, reject, suspend, or restore a member.
 *
 * Suspending deactivates the coupon rather than deleting it, so a membership
 * can be restored without the student having to learn a new code.
 */
export const updateStudentMember = controllerWrapper("updateStudentMember", async (req, res) => {
  const { status, rejectionReason } = req.body || {};
  const allowed = ["verified", "rejected", "suspended", "expired", "pending"];
  if (!allowed.includes(status)) return fail(res, 400, "Unknown status.");

  const profile = await StudentProfile.findById(req.params.id);
  if (!profile) return fail(res, 404, "Member not found.");

  const program = await StudentProgram.load();
  const user = await User.findById(profile.user);

  profile.status = status;
  profile.rejectionReason = status === "rejected" ? rejectionReason : undefined;
  profile.approvedBy = req.user._id;

  if (status === "verified") {
    profile.verifiedAt = profile.verifiedAt || new Date();
    profile.expiresAt =
      profile.expiresAt || new Date(Date.now() + (program.membershipDays ?? 365) * 24 * 60 * 60 * 1000);
    profile.periodStartedAt = new Date();
    const coupon = await issueCoupon(profile, program);
    profile.coupon = coupon._id;
    await profile.save();
    if (user) await sendStudentDiscountEmail(user, profile, coupon, describeTerms(program, profile.expiresAt));
    return ok(res, { message: "Member approved and code sent." });
  }

  if (profile.coupon) await Coupon.findByIdAndUpdate(profile.coupon, { isActive: false });
  await profile.save();
  return ok(res, { message: "Member updated." });
});

export const getStudentStats = controllerWrapper("getStudentStats", async (req, res) => {
  const [byStatus, redeemed] = await Promise.all([
    StudentProfile.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Coupon.aggregate([
      { $match: { assignedUser: { $ne: null } } },
      { $group: { _id: null, uses: { $sum: "$usageCount" }, codes: { $sum: 1 } } },
    ]),
  ]);

  const counts = byStatus.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {});
  return ok(res, {
    stats: {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      pending: counts.pending || 0,
      verified: counts.verified || 0,
      rejected: counts.rejected || 0,
      suspended: counts.suspended || 0,
      expired: counts.expired || 0,
      codesIssued: redeemed[0]?.codes || 0,
      redemptions: redeemed[0]?.uses || 0,
    },
  });
});

/**
 * Cron: roll every elapsed renewal window, and retire memberships that have
 * run past their expiry. Students who never open the page are the reason this
 * exists — the lazy roll in `getMyStudentProfile` only helps the ones who do.
 */
export const performStudentMaintenance = async () => {
  const program = await StudentProgram.load();
  const active = await StudentProfile.find({ status: "verified" });

  let rolled = 0;
  for (const profile of active) {
    if (await rollRenewalWindow(profile, program)) rolled += 1;
  }

  const stale = await StudentProfile.find({
    status: "verified",
    expiresAt: { $lt: new Date() },
  });
  for (const profile of stale) {
    profile.status = "expired";
    await profile.save();
    if (profile.coupon) await Coupon.findByIdAndUpdate(profile.coupon, { isActive: false });
  }

  return { rolled, expired: stale.length };
};

export const runStudentMaintenance = controllerWrapper("runStudentMaintenance", async (req, res) => {
  return ok(res, await performStudentMaintenance());
});
