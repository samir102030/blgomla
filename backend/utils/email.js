import { Resend } from "resend";
import jwt from "jsonwebtoken";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "Belgomla <noreply@belgmla.com>";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@belgmla.com";
// Every link a customer clicks out of an email is built from this — the
// verification link most of all, which is the only way a new account can be
// used. Set CLIENT_URL on every deployment: the fallback exists so a missing
// variable doesn't produce `undefined/verify/...`, not because it is right.
const CLIENT_URL = process.env.CLIENT_URL || "https://blgomla.vercel.app";
const API_URL =
  process.env.API_URL ||
  process.env.PUBLIC_API_URL ||
  "https://api.belgmla.com";

// One-click unsubscribe link. Signed with JWT_SECRET so the route can verify
// it without a DB lookup or session. `type` matches a key under User.emailPreferences.
export const buildUnsubscribeLink = (userId, type) => {
  if (!process.env.JWT_SECRET) return null;
  const token = jwt.sign({ uid: String(userId), t: type }, process.env.JWT_SECRET, {
    expiresIn: "365d",
  });
  return `${API_URL.replace(/\/$/, "")}/api/emails/unsubscribe?token=${encodeURIComponent(token)}`;
};

/**
 * `Name <address@host>` split into the parts Brevo wants separately. Resend
 * takes the header as written, so this is only used on the Brevo path.
 */
const parseSender = (value) => {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value || "");
  if (match) return { name: match[1] || undefined, email: match[2] };
  return { email: String(value || "").trim() };
};

/**
 * RFC 8058 one-click unsubscribe. Gmail and Outlook put a native
 * "Unsubscribe" control next to the sender name when these are present, which
 * is what keeps marketing-class mail out of the spam folder.
 */
const unsubscribeHeaders = (unsubscribeUrl) =>
  unsubscribeUrl
    ? {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
    : undefined;

const sendViaResend = async ({ to, subject, html, text, replyTo, unsubscribeUrl }) => {
  const headers = unsubscribeHeaders(unsubscribeUrl);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    reply_to: replyTo || SUPPORT_EMAIL,
    ...(headers ? { headers } : {}),
  });
  if (error) {
    console.error("[Email] Resend error:", error);
    return null;
  }
  console.log("[Email] Sent via Resend:", data?.id);
  return data;
};

const brevoApi = async (path) => {
  const response = await fetch(`https://api.brevo.com/v3${path}`, {
    headers: { accept: "application/json", "api-key": process.env.BREVO_API_KEY },
  });
  if (!response.ok) throw new Error(`${path} -> ${response.status}`);
  return response.json();
};

/**
 * Is FROM_EMAIL an address Brevo will actually send from?
 *
 * Worth a network call because of how Brevo fails when it is not: the send
 * returns 200 with a message id, and the rejection — "the sender you used is
 * not valid" — is recorded minutes later on an events endpoint nobody is
 * watching. Every message is lost and every caller is told it was sent.
 *
 * Checked once per process and remembered, so this costs one request on the
 * first send of a container's life. If the check itself cannot be made the
 * answer is "yes": a blip reaching their API is no reason to stop the shop
 * mailing receipts.
 */
let senderCheck = null;
const brevoSenderUsable = () => {
  senderCheck ??= (async () => {
    const address = parseSender(FROM_EMAIL).email?.toLowerCase();
    if (!address) return true;
    try {
      const [senders, domains] = await Promise.all([
        brevoApi("/senders"),
        brevoApi("/senders/domains"),
      ]);
      const verified = (senders?.senders || []).some(
        (s) => String(s.email).toLowerCase() === address,
      );
      const host = address.slice(address.lastIndexOf("@") + 1);
      const authenticated = (domains?.domains || []).some(
        (d) => String(d.domain_name || d.domain).toLowerCase() === host && d.authenticated,
      );
      if (!verified && !authenticated) {
        console.error(
          `[Email] Brevo will reject every send: FROM_EMAIL is <${address}>, which is ` +
            `neither a verified sender nor on an authenticated domain. Authenticate ` +
            `${host} in Brevo, or set FROM_EMAIL to an address that is verified.`,
        );
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[Email] Could not check the Brevo sender:", err.message);
      return true;
    }
  })();
  return senderCheck;
};

/**
 * Brevo's transactional endpoint, called over plain `fetch`.
 *
 * No SDK: this is one POST with a JSON body, and their package would be a
 * dependency carrying an HTTP client we already have built in.
 */
const sendViaBrevo = async ({ to, subject, html, text, replyTo, unsubscribeUrl }) => {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean).map((email) => ({ email }));
  if (!recipients.length) return null;

  // Refuse rather than collect a message id for something that will be
  // dropped — the student portal reads this answer to decide whether to tell
  // somebody their link is on the way.
  if (!(await brevoSenderUsable())) return null;

  const headers = unsubscribeHeaders(unsubscribeUrl);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: parseSender(FROM_EMAIL),
      to: recipients,
      subject,
      htmlContent: html,
      // Brevo rejects an empty string here, so send the field only when there
      // is a plain-text part to send.
      ...(text ? { textContent: text } : {}),
      replyTo: { email: replyTo || SUPPORT_EMAIL },
      ...(headers ? { headers } : {}),
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // Their errors are the useful kind — an unverified sender, a blocked
    // recipient — so log the message rather than just the status.
    console.error(
      "[Email] Brevo error:",
      response.status,
      body?.message || body?.code || "(no body)",
    );
    return null;
  }
  console.log("[Email] Sent via Brevo:", body?.messageId);
  return body;
};

/**
 * Send one message, by whichever provider is configured.
 *
 * Brevo wins when both keys are present, on the grounds that setting the
 * newer key is the deliberate act. Returns null on every failure rather than
 * throwing: a checkout must not fall over because a receipt did not send. The
 * student programme is the exception and checks the return value, because
 * there the message *is* the product.
 */
const sendEmail = async ({ to, subject, html, text, replyTo, unsubscribeUrl }) => {
  const payload = { to, subject, html, text, replyTo, unsubscribeUrl };
  try {
    if (process.env.BREVO_API_KEY) return await sendViaBrevo(payload);
    if (process.env.RESEND_API_KEY && resend) return await sendViaResend(payload);
    console.warn("[Email] No mail provider configured — skipping email to", to);
    return null;
  } catch (err) {
    console.error("[Email] Failed to send:", err.message);
    return null;
  }
};

/* ─────────────────────────────────────────────────
   DESIGN SYSTEM
   ─────────────────────────────────────────────────
   Inline styles only — Gmail strips most <style> blocks. Tokens kept
   here as constants so a refactor only touches one place.
*/

const T = {
  // Brand
  navy: "#002B5B",
  navyDark: "#001a3a",
  orange: "#FF6A1A",
  orangeDark: "#E5570A",
  // Neutrals
  text: "#111827",
  textMuted: "#4B5563",
  textSubtle: "#6B7280",
  border: "#E5E7EB",
  borderSoft: "#F3F4F6",
  bg: "#F7F8FB",
  surface: "#FFFFFF",
  // Status
  successBg: "#ECFDF5",
  successText: "#047857",
  errorBg: "#FEF2F2",
  errorText: "#B91C1C",
  warningBg: "#FFFBEB",
  warningText: "#92400E",
};

const FONT_STACK = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

/**
 * Logo: uses the apple-touch-icon already published with the storefront.
 * 180×180 source, rendered at 56×56 on dark navy.
 */
const LOGO_URL = `${CLIENT_URL}/icons/apple-touch-icon.png`;

/**
 * Localised strings.
 */
const STRINGS = {
  en: {
    tagline: "Egypt's IT & Networking Marketplace",
    questions: "Questions? Email us at",
    visitStore: "Visit Store",
    rights: "All rights reserved.",
    address: "Belgomla, Cairo, Egypt",
    youReceived: "You are receiving this email because you have an account at Belgomla.",
    unsubscribeNote: "Transactional emails about your account cannot be unsubscribed.",
    privacy: "Privacy",
    terms: "Terms",
    contact: "Contact",
    unsubscribe: "Unsubscribe from these emails",
  },
  ar: {
    tagline: "السوق الأول في مصر لتكنولوجيا المعلومات والشبكات",
    questions: "هل لديك سؤال؟ راسلنا على",
    visitStore: "زيارة المتجر",
    rights: "جميع الحقوق محفوظة.",
    address: "بالجملة، القاهرة، مصر",
    youReceived: "أنت تتلقى هذا البريد لأن لديك حسابًا في بالجملة.",
    unsubscribeNote: "لا يمكن إلغاء الاشتراك في رسائل الحساب التشغيلية.",
    privacy: "الخصوصية",
    terms: "الشروط",
    contact: "اتصل بنا",
    unsubscribe: "إلغاء الاشتراك في هذه الرسائل",
  },
};

const pickLang = (lang) => (String(lang || "").toLowerCase().startsWith("ar") ? "ar" : "en");

/**
 * Layout wrapper. Renders header + body + footer with a fixed 600px max
 * width that collapses on narrow screens via a small <style> block in
 * <head> (Gmail honours this).
 */
const renderEmailLayout = ({ lang = "en", previewText = "", body = "", unsubscribeUrl = null }) => {
  const L = pickLang(lang);
  const t = STRINGS[L];
  const dir = L === "ar" ? "rtl" : "ltr";
  const align = L === "ar" ? "right" : "left";
  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="${L}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Belgomla</title>
<style>
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .pad-x { padding-left: 20px !important; padding-right: 20px !important; }
    .pad-y { padding-top: 24px !important; padding-bottom: 24px !important; }
    .h1 { font-size: 22px !important; }
    .code { font-size: 28px !important; letter-spacing: 6px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .bg-page { background: #0B0D12 !important; }
    .card { background: #14171F !important; }
    .text { color: #E6E8EE !important; }
    .text-muted { color: #9AA3B2 !important; }
    .border-row { border-color: #232838 !important; }
    .footer-bg { background: #0F1218 !important; }
  }
  a { color: ${T.orange}; }
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background:${T.bg};font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;">
<!-- preview text (hidden, shows in inbox preview) -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${T.bg};opacity:0;">${previewText}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${T.bg};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px;max-width:600px;">

        <!-- HEADER -->
        <tr>
          <td style="background:${T.navy};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="Belgomla" width="56" height="56" style="display:inline-block;border:0;border-radius:12px;">
            <div style="margin-top:10px;color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.01em;font-family:${FONT_STACK};">
              Belgomla
            </div>
            <div style="margin-top:4px;color:${T.orange};font-size:12px;letter-spacing:0.06em;text-transform:uppercase;font-family:${FONT_STACK};">
              ${t.tagline}
            </div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="card pad-x pad-y" style="background:${T.surface};padding:36px 40px;border-left:1px solid ${T.border};border-right:1px solid ${T.border};">
            <div dir="${dir}" style="text-align:${align};color:${T.text};font-family:${FONT_STACK};font-size:15px;line-height:1.6;">
              ${body}
            </div>
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr>
          <td style="background:${T.surface};border-left:1px solid ${T.border};border-right:1px solid ${T.border};">
            <div style="border-top:1px solid ${T.borderSoft};margin:0 40px;"></div>
          </td>
        </tr>

        <!-- SUPPORT -->
        <tr>
          <td class="card pad-x" style="background:${T.surface};padding:20px 40px;border-left:1px solid ${T.border};border-right:1px solid ${T.border};text-align:${align};">
            <div dir="${dir}" style="color:${T.textMuted};font-family:${FONT_STACK};font-size:13px;line-height:1.6;">
              ${t.questions} <a href="mailto:${SUPPORT_EMAIL}" style="color:${T.orange};text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="footer-bg" style="background:${T.bg};border:1px solid ${T.border};border-top:0;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;font-family:${FONT_STACK};">
            <div style="margin-bottom:8px;">
              <a href="${CLIENT_URL}" style="color:${T.textMuted};text-decoration:none;font-size:12px;margin:0 8px;">${t.visitStore}</a>
              <span style="color:${T.border};">·</span>
              <a href="${CLIENT_URL}/privacy" style="color:${T.textMuted};text-decoration:none;font-size:12px;margin:0 8px;">${t.privacy}</a>
              <span style="color:${T.border};">·</span>
              <a href="${CLIENT_URL}/terms" style="color:${T.textMuted};text-decoration:none;font-size:12px;margin:0 8px;">${t.terms}</a>
              <span style="color:${T.border};">·</span>
              <a href="${CLIENT_URL}/contact" style="color:${T.textMuted};text-decoration:none;font-size:12px;margin:0 8px;">${t.contact}</a>
            </div>
            <div style="color:${T.textSubtle};font-size:11px;line-height:1.6;">
              © ${year} Belgomla. ${t.rights}<br>
              ${t.address}<br>
              <span style="color:${T.textSubtle};opacity:0.8;">${t.youReceived}</span>
              ${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}" style="color:${T.textSubtle};text-decoration:underline;opacity:0.85;">${t.unsubscribe}</a>` : ""}
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};

/* ─────────────────────────────────────────────────
   PARTIALS — reusable inside body blocks
   ───────────────────────────────────────────────── */

const codeBox = (code) => `
  <div style="margin:24px 0;text-align:center;">
    <div style="display:inline-block;background:${T.borderSoft};border:1px solid ${T.border};border-radius:12px;padding:18px 28px;">
      <div class="code" style="font-family:'SFMono-Regular',Menlo,Monaco,Consolas,monospace;font-size:34px;font-weight:700;color:${T.navy};letter-spacing:10px;">
        ${code}
      </div>
    </div>
  </div>
`;

const ctaButton = (href, label) => `
  <div style="margin:28px 0;text-align:center;">
    <a href="${href}" style="display:inline-block;background:${T.orange};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;font-family:${FONT_STACK};">
      ${label}
    </a>
  </div>
`;

const noticeBlock = (kind, content) => {
  const palette = {
    success: { bg: T.successBg, color: T.successText },
    error: { bg: T.errorBg, color: T.errorText },
    warning: { bg: T.warningBg, color: T.warningText },
  }[kind] || { bg: T.borderSoft, color: T.textMuted };
  return `
    <div style="margin:20px 0;padding:12px 16px;background:${palette.bg};border-radius:10px;color:${palette.color};font-size:13px;line-height:1.5;">
      ${content}
    </div>`;
};

/* ─────────────────────────────────────────────────
   TEMPLATES
   ───────────────────────────────────────────────── */

const greeting = (lang, name) => {
  const safeName = (name || "").trim() || (lang === "ar" ? "صديقنا" : "there");
  return lang === "ar" ? `أهلًا ${safeName}،` : `Hi ${safeName},`;
};

/**
 * Welcome email — sent right after signup. Includes verification code.
 */
export const sendWelcomeEmail = async (user) => {
  const lang = pickLang(user.lang || user.locale);
  const name = user.name;
  const code = user.verificationToken;

  const subjectMap = {
    en: "Welcome to Belgomla — verify your email",
    ar: "أهلًا بك في بالجملة — يرجى تأكيد بريدك الإلكتروني",
  };
  const previewMap = {
    en: code ? `Your verification code is ${code}` : "Your account is ready.",
    ar: code ? `رمز التحقق الخاص بك: ${code}` : "حسابك جاهز.",
  };

  const bodyEN = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">Welcome aboard 🎉</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("en", name)}</p>
    <p class="text" style="margin:0 0 14px;">Your Belgomla account is ready. You're now part of Egypt's premier IT & networking marketplace — from routers and switches to servers, security gear, and more.</p>
    ${code ? `
      <p class="text" style="margin:18px 0 8px;font-weight:600;">One last step — verify your email with this code:</p>
      ${codeBox(code)}
      <p class="text-muted" style="margin:0;color:${T.textMuted};font-size:13px;">This code expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
    ` : `
      ${ctaButton(CLIENT_URL, "Start Shopping")}
    `}
  `;

  const bodyAR = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">أهلًا بك معنا 🎉</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("ar", name)}</p>
    <p class="text" style="margin:0 0 14px;">حسابك في بالجملة جاهز. أصبحت الآن جزءًا من السوق الأول في مصر لتكنولوجيا المعلومات والشبكات — من الراوترات والسويتشات إلى السيرفرات وأنظمة الأمن وأكثر.</p>
    ${code ? `
      <p class="text" style="margin:18px 0 8px;font-weight:600;">خطوة أخيرة — يرجى تأكيد بريدك الإلكتروني بهذا الرمز:</p>
      ${codeBox(code)}
      <p class="text-muted" style="margin:0;color:${T.textMuted};font-size:13px;">صلاحية هذا الرمز 24 ساعة. إن لم تكن أنت من أنشأ هذا الحساب، يمكنك تجاهل هذه الرسالة.</p>
    ` : `
      ${ctaButton(CLIENT_URL, "ابدأ التسوق")}
    `}
  `;

  const html = renderEmailLayout({
    lang,
    previewText: previewMap[lang],
    body: lang === "ar" ? bodyAR : bodyEN,
  });

  const text = lang === "ar"
    ? `أهلًا بك في بالجملة\n\n${greeting("ar", name)}\nحسابك جاهز.${code ? `\n\nرمز التحقق: ${code}\nالصلاحية: 24 ساعة` : ""}\n\nالدعم: ${SUPPORT_EMAIL}`
    : `Welcome to Belgomla\n\n${greeting("en", name)}\nYour account is ready.${code ? `\n\nVerification code: ${code}\nExpires in 24 hours` : ""}\n\nSupport: ${SUPPORT_EMAIL}`;

  return sendEmail({ to: user.email, subject: subjectMap[lang], html, text });
};

/**
 * Standalone verification-code email (resend flow).
 */
export const sendVerificationEmail = async (user) => {
  const lang = pickLang(user.lang || user.locale);
  const code = user.verificationToken;

  const subjectMap = {
    en: "Your Belgomla verification code",
    ar: "رمز التحقق الخاص بك في بالجملة",
  };
  const previewMap = {
    en: `Your code: ${code}`,
    ar: `رمزك: ${code}`,
  };

  const bodyEN = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">Your verification code</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("en", user.name)}</p>
    <p class="text" style="margin:0 0 8px;">Use the code below to verify your email and finish signing in:</p>
    ${codeBox(code)}
    ${noticeBlock("warning", "This code expires in 24 hours. Never share it with anyone — Belgomla staff will never ask for it.")}
    <p class="text-muted" style="margin:14px 0 0;color:${T.textMuted};font-size:13px;">If you didn't request this, you can ignore this email — your account stays secure.</p>
  `;

  const bodyAR = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">رمز التحقق</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("ar", user.name)}</p>
    <p class="text" style="margin:0 0 8px;">استخدم الرمز أدناه لتأكيد بريدك وإتمام تسجيل الدخول:</p>
    ${codeBox(code)}
    ${noticeBlock("warning", "صلاحية هذا الرمز 24 ساعة. لا تشاركه مع أي شخص — موظفو بالجملة لن يطلبوا منك هذا الرمز أبدًا.")}
    <p class="text-muted" style="margin:14px 0 0;color:${T.textMuted};font-size:13px;">إن لم تطلب هذا الرمز يمكنك تجاهل الرسالة — حسابك آمن.</p>
  `;

  const html = renderEmailLayout({
    lang,
    previewText: previewMap[lang],
    body: lang === "ar" ? bodyAR : bodyEN,
  });

  const text = lang === "ar"
    ? `رمز التحقق: ${code}\nالصلاحية: 24 ساعة\nلا تشارك هذا الرمز مع أحد.`
    : `Your verification code: ${code}\nExpires in 24 hours.\nNever share this code with anyone.`;

  return sendEmail({ to: user.email, subject: subjectMap[lang], html, text });
};

/**
 * Password reset email (clickable button + link fallback).
 */
export const sendPasswordResetEmail = async (user, resetToken, clientUrl) => {
  const lang = pickLang(user.lang || user.locale);
  const base = clientUrl || CLIENT_URL;
  const resetLink = `${base}/reset-password/${resetToken}`;

  const subjectMap = {
    en: "Reset your Belgomla password",
    ar: "إعادة تعيين كلمة المرور في بالجملة",
  };
  const previewMap = {
    en: "Click to reset your password. Link valid for 1 hour.",
    ar: "اضغط لإعادة تعيين كلمة المرور. صالح لمدة ساعة.",
  };

  const bodyEN = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">Reset your password</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("en", user.name)}</p>
    <p class="text" style="margin:0 0 14px;">We received a request to reset the password for your Belgomla account. Click the button below to choose a new one.</p>
    ${ctaButton(resetLink, "Reset Password")}
    <p class="text-muted" style="margin:0 0 6px;color:${T.textMuted};font-size:13px;">Button not working? Paste this link into your browser:</p>
    <p style="margin:0 0 14px;word-break:break-all;font-family:'SFMono-Regular',Menlo,Monaco,Consolas,monospace;font-size:12px;color:${T.orange};">${resetLink}</p>
    ${noticeBlock("warning", "This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.")}
  `;

  const bodyAR = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">إعادة تعيين كلمة المرور</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("ar", user.name)}</p>
    <p class="text" style="margin:0 0 14px;">تلقّينا طلبًا لإعادة تعيين كلمة المرور لحسابك في بالجملة. اضغط الزر بالأسفل لاختيار كلمة مرور جديدة.</p>
    ${ctaButton(resetLink, "إعادة تعيين كلمة المرور")}
    <p class="text-muted" style="margin:0 0 6px;color:${T.textMuted};font-size:13px;">لا يعمل الزر؟ انسخ هذا الرابط إلى المتصفح:</p>
    <p style="margin:0 0 14px;word-break:break-all;font-family:'SFMono-Regular',Menlo,Monaco,Consolas,monospace;font-size:12px;color:${T.orange};direction:ltr;">${resetLink}</p>
    ${noticeBlock("warning", "صلاحية الرابط ساعة واحدة. إن لم تطلب إعادة التعيين يمكنك تجاهل هذه الرسالة.")}
  `;

  const html = renderEmailLayout({
    lang,
    previewText: previewMap[lang],
    body: lang === "ar" ? bodyAR : bodyEN,
  });

  const text = lang === "ar"
    ? `إعادة تعيين كلمة المرور:\n${resetLink}\nالصلاحية: ساعة واحدة.`
    : `Reset your password:\n${resetLink}\nLink valid for 1 hour.`;

  return sendEmail({ to: user.email, subject: subjectMap[lang], html, text });
};

/**
 * Order confirmation — itemized receipt.
 */
export const sendOrderConfirmationEmail = async (user, order) => {
  const lang = pickLang(user.lang || user.locale);
  const orderNum = order._id.toString().slice(-8).toUpperCase();
  const fmt = (n) => Number(n || 0).toFixed(2);

  const headersEN = ["Item", "Qty", "Price"];
  const headersAR = ["المنتج", "الكمية", "السعر"];
  const headers = lang === "ar" ? headersAR : headersEN;
  const align = lang === "ar" ? "right" : "left";

  const rows = (order.orderItems || [])
    .map((item) => `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid ${T.border};color:${T.text};">${item.product?.name || (lang === "ar" ? "منتج" : "Product")}</td>
        <td style="padding:12px 14px;border-bottom:1px solid ${T.border};color:${T.text};text-align:center;">${item.quantity}</td>
        <td style="padding:12px 14px;border-bottom:1px solid ${T.border};color:${T.text};text-align:${lang === "ar" ? "left" : "right"};">${fmt(item.price)} EGP</td>
      </tr>`)
    .join("");

  const subjectMap = {
    en: `Order confirmed — #${orderNum}`,
    ar: `تأكيد الطلب — #${orderNum}`,
  };
  const previewMap = {
    en: `Order #${orderNum} placed successfully — ${fmt(order.totalPrice)} EGP`,
    ar: `تم استلام طلبك #${orderNum} — ${fmt(order.totalPrice)} جنيه`,
  };

  const labels = lang === "ar"
    ? { title: "تم تأكيد طلبك ✅", para: "شكرًا لك! تم استلام طلبك وسنبدأ تجهيزه فورًا.", orderNo: "رقم الطلب", coupon: "خصم الكوبون", shipping: "الشحن", total: "الإجمالي", payment: "طريقة الدفع", track: "تتبّع طلبك" }
    : { title: "Order confirmed ✅", para: "Thanks! We've received your order and we'll get started on it right away.", orderNo: "Order number", coupon: "Coupon discount", shipping: "Shipping", total: "Total", payment: "Payment method", track: "Track Your Order" };

  const body = `
    <h1 class="h1 text" style="margin:0 0 12px;font-size:24px;font-weight:800;color:${T.navy};">${labels.title}</h1>
    <p class="text" style="margin:0 0 14px;">${greeting(lang, user.name)}</p>
    <p class="text" style="margin:0 0 18px;">${labels.para}</p>
    <div style="margin:18px 0;padding:10px 14px;background:${T.borderSoft};border-radius:8px;color:${T.text};font-size:13px;text-align:${align};">
      <strong>${labels.orderNo}:</strong> #${orderNum}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${T.border};border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;font-family:${FONT_STACK};font-size:14px;margin:10px 0;">
      <thead>
        <tr style="background:${T.borderSoft};">
          <th style="padding:10px 14px;text-align:${align};color:${T.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${headers[0]}</th>
          <th style="padding:10px 14px;text-align:center;color:${T.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${headers[1]}</th>
          <th style="padding:10px 14px;text-align:${lang === "ar" ? "left" : "right"};color:${T.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${headers[2]}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;font-family:${FONT_STACK};font-size:14px;">
      ${order.couponDiscount > 0 ? `
        <tr>
          <td style="padding:6px 0;color:${T.textMuted};">${labels.coupon}</td>
          <td style="padding:6px 0;text-align:${lang === "ar" ? "left" : "right"};color:${T.text};">−${fmt(order.couponDiscount)} EGP</td>
        </tr>` : ""}
      <tr>
        <td style="padding:6px 0;color:${T.textMuted};">${labels.shipping}</td>
        <td style="padding:6px 0;text-align:${lang === "ar" ? "left" : "right"};color:${T.text};">${fmt(order.shippingPrice)} EGP</td>
      </tr>
      <tr>
        <td style="padding:12px 0 6px;border-top:1px solid ${T.border};color:${T.navy};font-size:16px;font-weight:700;">${labels.total}</td>
        <td style="padding:12px 0 6px;border-top:1px solid ${T.border};text-align:${lang === "ar" ? "left" : "right"};color:${T.navy};font-size:16px;font-weight:700;">${fmt(order.totalPrice)} EGP</td>
      </tr>
    </table>
    <p class="text-muted" style="margin:18px 0 0;color:${T.textMuted};font-size:13px;"><strong>${labels.payment}:</strong> ${order.paymentMethod || "—"}</p>
    ${ctaButton(`${CLIENT_URL}/orders`, labels.track)}
  `;

  const html = renderEmailLayout({
    lang,
    previewText: previewMap[lang],
    body,
  });

  const text = lang === "ar"
    ? `${labels.title}\n${labels.orderNo}: #${orderNum}\n${labels.total}: ${fmt(order.totalPrice)} EGP\nالتتبّع: ${CLIENT_URL}/orders`
    : `${labels.title}\n${labels.orderNo}: #${orderNum}\n${labels.total}: ${fmt(order.totalPrice)} EGP\nTrack: ${CLIENT_URL}/orders`;

  return sendEmail({ to: user.email, subject: subjectMap[lang], html, text });
};

/**
 * Order status update — shipping/delivered/cancelled notifications.
 */
export const sendOrderStatusEmail = async (user, order, status) => {
  const lang = pickLang(user.lang || user.locale);
  const orderNum = order._id.toString().slice(-8).toUpperCase();

  const statusMeta = {
    processing: { emoji: "⚙️", kind: "warning", en: "is being processed", ar: "قيد التجهيز" },
    shipped:    { emoji: "🚚", kind: "success", en: "has been shipped",  ar: "تم شحنه" },
    delivered:  { emoji: "✅", kind: "success", en: "has been delivered", ar: "تم توصيله" },
    cancelled:  { emoji: "❌", kind: "error",   en: "has been cancelled", ar: "تم إلغاؤه" },
  };
  const meta = statusMeta[status] || { emoji: "📦", kind: "warning", en: "has been updated", ar: "تم تحديثه" };

  const subjectMap = {
    en: `Order ${status} — #${orderNum}`,
    ar: `حالة الطلب: ${meta.ar} — #${orderNum}`,
  };
  const previewMap = {
    en: `Order #${orderNum} ${meta.en}.`,
    ar: `طلبك #${orderNum} ${meta.ar}.`,
  };

  const labels = lang === "ar"
    ? { title: `تحديث الطلب ${meta.emoji}`, line: (n) => `طلبك <strong>#${n}</strong> ${meta.ar}.`, track: "تتبّع طلبك" }
    : { title: `Order update ${meta.emoji}`, line: (n) => `Your order <strong>#${n}</strong> ${meta.en}.`, track: "Track Your Order" };

  const body = `
    <h1 class="h1 text" style="margin:0 0 12px;font-size:24px;font-weight:800;color:${T.navy};">${labels.title}</h1>
    <p class="text" style="margin:0 0 14px;">${greeting(lang, user.name)}</p>
    <p class="text" style="margin:0 0 14px;">${labels.line(orderNum)}</p>
    ${noticeBlock(meta.kind, `<strong style="text-transform:uppercase;letter-spacing:0.08em;font-size:12px;">${lang === "ar" ? meta.ar : status}</strong>`)}
    ${ctaButton(`${CLIENT_URL}/orders`, labels.track)}
  `;

  const html = renderEmailLayout({
    lang,
    previewText: previewMap[lang],
    body,
  });

  const text = lang === "ar"
    ? `${labels.title}\nطلبك #${orderNum} ${meta.ar}.\n${CLIENT_URL}/orders`
    : `${labels.title}\nOrder #${orderNum} ${meta.en}.\n${CLIENT_URL}/orders`;

  return sendEmail({ to: user.email, subject: subjectMap[lang], html, text });
};

/**
 * Post-purchase review request — sent a few days after delivery to grow review
 * volume (trust + SEO) and bring the customer back to the store.
 */
export const sendReviewRequestEmail = async (user, order) => {
  const lang = pickLang(user.lang || user.locale);
  const orderNum = order._id.toString().slice(-8).toUpperCase();

  const subjectMap = {
    en: `How was your order? — #${orderNum}`,
    ar: `شاركنا رأيك في طلبك — #${orderNum}`,
  };
  const labels =
    lang === "ar"
      ? {
          title: "رأيك يهمنا ⭐",
          line: "نتمنى أن تكون قد استمتعت بمنتجاتك. تقييم سريع يساعد عملاء آخرين على الاختيار.",
          cta: "أضف تقييمك",
          browse: "اكتشف المزيد من المنتجات",
        }
      : {
          title: "How did we do? ⭐",
          line: "We hope you're enjoying your purchase. A quick review helps other shoppers decide.",
          cta: "Write a review",
          browse: "Discover more products",
        };

  const body = `
    <h1 class="h1 text" style="margin:0 0 12px;font-size:24px;font-weight:800;color:${T.navy};">${labels.title}</h1>
    <p class="text" style="margin:0 0 14px;">${greeting(lang, user.name)}</p>
    <p class="text" style="margin:0 0 14px;">${labels.line}</p>
    ${ctaButton(`${CLIENT_URL}/orders`, labels.cta)}
    <p class="text" style="margin:18px 0 0;font-size:14px;"><a href="${CLIENT_URL}/products" style="color:${T.navy};">${labels.browse} →</a></p>
  `;

  const html = renderEmailLayout({ lang, previewText: labels.line, body });
  const text =
    lang === "ar"
      ? `${labels.title}\n${labels.line}\n${CLIENT_URL}/orders`
      : `${labels.title}\n${labels.line}\n${CLIENT_URL}/orders`;

  return sendEmail({ to: user.email, subject: subjectMap[lang], html, text });
};

/**
 * Back-in-stock / price-drop alert for a single product. `email` is a raw
 * address (alerts are anonymous-friendly), `type` is "restock" | "price_drop".
 */
/**
 * Tell the shop somebody wrote in.
 *
 * Goes to CONTACT_INBOX, falling back to the address inside FROM_EMAIL — so
 * it lands somewhere real on the day it ships rather than waiting for one
 * more setting to be filled in. `replyTo` is the customer, which is the
 * whole point: whoever opens it can answer by pressing reply.
 *
 * Written in English on purpose. It is read by the shop, not the customer,
 * and it quotes the customer's own words untouched.
 */
export const sendContactEnquiryEmail = async (enquiry) => {
  const inbox =
    process.env.CONTACT_INBOX ||
    (FROM_EMAIL.match(/<([^>]+)>/)?.[1] ?? FROM_EMAIL);

  const rows = [
    ["Name", enquiry.name],
    ["Email", enquiry.email],
    ["Phone", enquiry.phone],
    ["Company", enquiry.company],
    ["Subject", enquiry.subject],
  ].filter(([, value]) => value);

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const body = `
    <h1 class="h1 text" style="margin:0 0 12px;font-size:22px;font-weight:800;color:${T.navy};">New message from the contact page</h1>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px;">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap;">${label}</td>` +
            `<td style="padding:4px 0;font-size:14px;">${escapeHtml(value)}</td></tr>`
        )
        .join("")}
    </table>
    <div style="padding:14px 16px;background:#f3f4f6;border-radius:10px;white-space:pre-wrap;font-size:14px;line-height:1.7;">${escapeHtml(
      enquiry.message
    )}</div>
  `;

  const html = renderEmailLayout({
    lang: "en",
    previewText: `${enquiry.name}: ${String(enquiry.message).slice(0, 90)}`,
    body,
  });
  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    enquiry.message,
  ].join("\n");

  return sendEmail({
    to: inbox,
    subject: `Contact form: ${enquiry.subject || enquiry.name}`,
    html,
    text,
    replyTo: enquiry.email,
  });
};

/**
 * Tell the shop an order has come in.
 *
 * A Notification document was already created for the store's owner, and it
 * shows in the dashboard bell. That is the whole of it: nothing leaves the
 * site. So the shop learns it has an order when somebody happens to open the
 * dashboard and look — on a shop whose only working payment method is cash on
 * delivery, where the order has to be packed and dispatched before anybody is
 * paid at all.
 *
 * Goes to the same inbox as the contact form, by the same rule: CONTACT_INBOX,
 * falling back to the address inside FROM_EMAIL, so it lands somewhere real
 * without one more setting having to be filled in first. `replyTo` is the
 * customer, so a question about the order is one press of reply.
 *
 * Written in English: this is read by the shop, not by the customer.
 */
export const sendNewOrderEmail = async (order, customer, itemCount) => {
  const inbox =
    process.env.CONTACT_INBOX || (FROM_EMAIL.match(/<([^>]+)>/)?.[1] ?? FROM_EMAIL);

  const short = String(order._id).slice(-8).toUpperCase();
  const money = (n) => `EGP ${Number(n || 0).toLocaleString("en-EG")}`;
  const esc = (v) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const rows = [
    ["Order", `#${short}`],
    ["Total", money(order.totalPrice)],
    ["Payment", order.paymentMethod === "cod" ? "Cash on delivery" : order.paymentMethod],
    ["Items", itemCount],
    ["Customer", customer?.name],
    ["Email", customer?.email],
    ["Phone", customer?.phoneNumber],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  const body = `
    <h1 class="h1 text" style="margin:0 0 12px;font-size:22px;font-weight:800;color:${T.navy};">New order #${short}</h1>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap;">${label}</td>` +
            `<td style="padding:4px 0;font-size:14px;font-weight:600;">${esc(value)}</td></tr>`
        )
        .join("")}
    </table>
    ${ctaButton(`${CLIENT_URL}/dashboard/order`, "Open it in the dashboard")}
  `;

  return sendEmail({
    to: inbox,
    subject: `New order #${short} — ${money(order.totalPrice)}`,
    html: renderEmailLayout({ lang: "en", previewText: `${customer?.name || "A customer"} — ${money(order.totalPrice)}`, body }),
    text: rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
    replyTo: customer?.email,
  });
};

export const sendStockAlertEmail = async (email, product, type, lang = "en") => {
  const l = pickLang(lang);
  const url = `${CLIENT_URL}/product/${product._id}`;
  const isDrop = type === "price_drop";

  const subjectMap = isDrop
    ? { en: `Price drop: ${product.name}`, ar: `انخفض السعر: ${product.name}` }
    : { en: `Back in stock: ${product.name}`, ar: `عاد للمخزون: ${product.name}` };

  const labels =
    l === "ar"
      ? {
          title: isDrop ? "انخفض السعر 🎉" : "عاد المنتج للمخزون ✅",
          line: isDrop
            ? `انخفض سعر <strong>${product.name}</strong> الذي كنت تتابعه.`
            : `<strong>${product.name}</strong> متوفر الآن. اطلبه قبل نفاد الكمية.`,
          cta: isDrop ? "اشترِ الآن" : "اطلب الآن",
        }
      : {
          title: isDrop ? "Price drop 🎉" : "Back in stock ✅",
          line: isDrop
            ? `The price of <strong>${product.name}</strong> just dropped.`
            : `<strong>${product.name}</strong> is available again. Grab it before it's gone.`,
          cta: isDrop ? "Buy now" : "Order now",
        };

  const body = `
    <h1 class="h1 text" style="margin:0 0 12px;font-size:24px;font-weight:800;color:${T.navy};">${labels.title}</h1>
    <p class="text" style="margin:0 0 14px;">${labels.line}</p>
    ${ctaButton(url, labels.cta)}
  `;

  const html = renderEmailLayout({ lang: l, previewText: labels.line, body });
  const text = `${labels.title}\n${product.name}\n${url}`;

  return sendEmail({ to: email, subject: subjectMap[l], html, text });
};

/**
 * Abandoned-cart recovery — nudges a user who left items in their cart.
 * `cartItems` is the populated cart array (cart.product / cart.collection).
 * `stage` (1|2|3) lets the copy escalate gently across the sequence.
 */
export const sendAbandonedCartEmail = async (user, cartItems = [], stage = 1) => {
  const lang = pickLang(user.lang || user.locale);
  const fmt = (n) => Number(n || 0).toFixed(2);
  const align = lang === "ar" ? "right" : "left";

  const itemName = (item) => {
    if (item.type === "collection") {
      return item.collection?.name || (lang === "ar" ? "مجموعة" : "Bundle");
    }
    return item.product?.name || (lang === "ar" ? "منتج" : "Product");
  };
  const itemPrice = (item) =>
    item.type === "collection"
      ? item.collection?.bundlePrice
      : item.product?.salePrice || item.product?.price;
  const itemImage = (item) =>
    (item.type === "collection"
      ? item.collection?.image
      : item.product?.images?.[0]?.url) || "";

  const visible = (cartItems || []).filter(
    (i) => i.product || i.collection
  );
  if (visible.length === 0) return { skipped: true };

  const headers =
    lang === "ar" ? ["المنتج", "الكمية", "السعر"] : ["Item", "Qty", "Price"];

  const rows = visible
    .map((item) => `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid ${T.border};color:${T.text};">
          ${itemImage(item) ? `<img src="${itemImage(item)}" alt="" width="40" height="40" style="border-radius:6px;vertical-align:middle;margin-${lang === "ar" ? "left" : "right"}:10px;object-fit:cover;" />` : ""}
          ${itemName(item)}
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid ${T.border};color:${T.text};text-align:center;">${item.quantity || 1}</td>
        <td style="padding:12px 14px;border-bottom:1px solid ${T.border};color:${T.text};text-align:${lang === "ar" ? "left" : "right"};">${fmt(itemPrice(item))} EGP</td>
      </tr>`)
    .join("");

  // Copy escalates a little across the 3 stages.
  const copy = lang === "ar"
    ? {
        title: stage >= 3 ? "فرصة أخيرة 🛒" : stage === 2 ? "سلتك ما زالت في انتظارك 🛒" : "نسيت شيئًا؟ 🛒",
        para: stage >= 3
          ? "هذه آخر فرصة — العناصر التي اخترتها قد تنفد قريبًا. أكمل طلبك الآن."
          : "لا تزال العناصر التي اخترتها محفوظة في سلتك. أكمل طلبك قبل نفاد الكمية.",
        cta: "أكمل عملية الشراء",
      }
    : {
        title: stage >= 3 ? "Last chance 🛒" : stage === 2 ? "Your cart is still waiting 🛒" : "Forgot something? 🛒",
        para: stage >= 3
          ? "This is your final reminder — the items you picked may sell out soon. Complete your order now."
          : "The items you picked are still saved in your cart. Check out before they're gone.",
        cta: "Complete your purchase",
      };

  const subjectMap = {
    en:
      stage >= 3
        ? "Last chance — your cart is about to expire"
        : stage === 2
        ? "Still thinking it over? Your cart is waiting"
        : "You left something in your cart",
    ar:
      stage >= 3
        ? "فرصة أخيرة — سلتك على وشك الانتهاء"
        : stage === 2
        ? "ما زلت تفكر؟ سلتك في انتظارك"
        : "لقد تركت شيئًا في سلتك",
  };

  const body = `
    <h1 class="h1 text" style="margin:0 0 12px;font-size:24px;font-weight:800;color:${T.navy};">${copy.title}</h1>
    <p class="text" style="margin:0 0 14px;">${greeting(lang, user.name)}</p>
    <p class="text" style="margin:0 0 18px;">${copy.para}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${T.border};border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;font-family:${FONT_STACK};font-size:14px;margin:10px 0;">
      <thead>
        <tr style="background:${T.borderSoft};">
          <th style="padding:10px 14px;text-align:${align};color:${T.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${headers[0]}</th>
          <th style="padding:10px 14px;text-align:center;color:${T.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${headers[1]}</th>
          <th style="padding:10px 14px;text-align:${lang === "ar" ? "left" : "right"};color:${T.textMuted};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${headers[2]}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${ctaButton(`${CLIENT_URL}/cart`, copy.cta)}
  `;

  const unsubscribeUrl = buildUnsubscribeLink(user._id, "cartRecovery");
  const html = renderEmailLayout({ lang, previewText: copy.para, body, unsubscribeUrl });
  const text = `${copy.title}\n${copy.para}\n${CLIENT_URL}/cart${unsubscribeUrl ? `\n\n${unsubscribeUrl}` : ""}`;

  return sendEmail({
    to: user.email,
    subject: subjectMap[lang],
    html,
    text,
    unsubscribeUrl,
  });
};

/**
 * University student programme — prove the address.
 *
 * Sent to the university mailbox, never to the account address: holding the
 * faculty mailbox is the entire proof of enrolment, so the link has to arrive
 * there and nowhere else.
 */
export const sendStudentVerificationEmail = async (user, profile, token, clientUrl) => {
  const lang = pickLang(user?.lang || user?.locale);
  const base = clientUrl || CLIENT_URL;
  // New links point at the section's own path. `/students/verify/:token` still
  // resolves on the site, so a link already sitting in somebody's inbox keeps
  // working — an email outlives a rename.
  const link = `${base}/electronics/verify/${token}`;

  const subjectMap = {
    en: "Confirm your university email — Belgomla Students",
    ar: "أكّد بريدك الجامعي — طلاب بالجملة",
  };
  const previewMap = {
    en: "One click to confirm your faculty address and unlock your student discount.",
    ar: "ضغطة واحدة لتأكيد بريد كليتك وتفعيل خصم الطلاب.",
  };

  const bodyEN = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">Confirm your university email</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("en", user?.name)}</p>
    <p class="text" style="margin:0 0 14px;">You asked to join the Belgomla student programme with <strong>${profile.universityEmail}</strong>. Confirm the address to unlock your personal discount code on electronics.</p>
    ${ctaButton(link, "Confirm my email")}
    <p class="text-muted" style="margin:0 0 6px;color:${T.textMuted};font-size:13px;">Button not working? Paste this link into your browser:</p>
    <p style="margin:0 0 14px;word-break:break-all;font-family:'SFMono-Regular',Menlo,Monaco,Consolas,monospace;font-size:12px;color:${T.orange};">${link}</p>
    ${noticeBlock("warning", "This link is valid for 1 hour. If you did not ask to join, you can ignore this email — nothing will happen to your account.")}
  `;

  const bodyAR = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">أكّد بريدك الجامعي</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("ar", user?.name)}</p>
    <p class="text" style="margin:0 0 14px;">طلبت الانضمام لبرنامج طلاب بالجملة باستخدام <strong>${profile.universityEmail}</strong>. أكّد البريد لتحصل على كود الخصم الشخصي على الإلكترونيات.</p>
    ${ctaButton(link, "تأكيد البريد")}
    <p class="text-muted" style="margin:0 0 6px;color:${T.textMuted};font-size:13px;">لا يعمل الزر؟ انسخ هذا الرابط إلى المتصفح:</p>
    <p style="margin:0 0 14px;word-break:break-all;font-family:'SFMono-Regular',Menlo,Monaco,Consolas,monospace;font-size:12px;color:${T.orange};direction:ltr;">${link}</p>
    ${noticeBlock("warning", "صلاحية الرابط ساعة واحدة. إن لم تطلب الانضمام تجاهل الرسالة — لن يحدث أي تغيير في حسابك.")}
  `;

  const html = renderEmailLayout({
    lang,
    previewText: previewMap[lang],
    body: lang === "ar" ? bodyAR : bodyEN,
  });

  const text = lang === "ar"
    ? `أكّد بريدك الجامعي:\n${link}\nالصلاحية: ساعة واحدة.`
    : `Confirm your university email:\n${link}\nLink valid for 1 hour.`;

  return sendEmail({ to: profile.universityEmail, subject: subjectMap[lang], html, text });
};

/**
 * University student programme — deliver the code.
 *
 * `terms` is prose the caller formats from the live programme settings rather
 * than anything hard-coded here, so an admin who changes the discount does not
 * leave this email describing the old one.
 */
export const sendStudentDiscountEmail = async (user, profile, coupon, terms = {}) => {
  const lang = pickLang(user?.lang || user?.locale);
  const shopLink = `${CLIENT_URL}/students`;

  const subjectMap = {
    en: "Your Belgomla student discount code",
    ar: "كود خصم الطلاب الخاص بك",
  };
  const previewMap = {
    en: `Your personal code ${coupon.code} is ready.`,
    ar: `كودك الشخصي ${coupon.code} جاهز.`,
  };

  const line = (v) => (v ? `<li style="margin:0 0 6px;">${v}</li>` : "");

  const bodyEN = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">Your student code is ready</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("en", user?.name)}</p>
    <p class="text" style="margin:0 0 14px;">Your faculty address is confirmed. This code is yours alone — it is tied to your account and will not work for anyone else.</p>
    ${codeBox(coupon.code)}
    <ul class="text" style="margin:0 0 18px;padding-inline-start:18px;font-size:14px;">
      ${line(terms.discountEN)}
      ${line(terms.scopeEN)}
      ${line(terms.renewalEN)}
      ${line(terms.expiryEN)}
    </ul>
    ${ctaButton(shopLink, "Shop the student store")}
    ${noticeBlock("warning", "Keep the code to yourself. It is checked against your account at checkout, so a shared code simply fails for the other person.")}
  `;

  const bodyAR = `
    <h1 class="h1 text" style="margin:0 0 16px;font-size:24px;font-weight:800;color:${T.navy};">كودك الطلابي جاهز</h1>
    <p class="text" style="margin:0 0 14px;">${greeting("ar", user?.name)}</p>
    <p class="text" style="margin:0 0 14px;">تم تأكيد بريد كليتك. الكود ده ليك وحدك — مربوط بحسابك ولن يعمل مع أي شخص آخر.</p>
    ${codeBox(coupon.code)}
    <ul class="text" style="margin:0 0 18px;padding-inline-start:18px;font-size:14px;">
      ${line(terms.discountAR)}
      ${line(terms.scopeAR)}
      ${line(terms.renewalAR)}
      ${line(terms.expiryAR)}
    </ul>
    ${ctaButton(shopLink, "تسوّق متجر الطلاب")}
    ${noticeBlock("warning", "احتفظ بالكود لنفسك. يتم التحقق منه مقابل حسابك عند الدفع، فالكود المُشارَك لا يعمل مع غيرك.")}
  `;

  const html = renderEmailLayout({
    lang,
    previewText: previewMap[lang],
    body: lang === "ar" ? bodyAR : bodyEN,
  });

  const text = lang === "ar"
    ? `كود خصم الطلاب: ${coupon.code}\n${shopLink}`
    : `Your student discount code: ${coupon.code}\n${shopLink}`;

  return sendEmail({ to: profile.universityEmail, subject: subjectMap[lang], html, text });
};

export default sendEmail;
