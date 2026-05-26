import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

const ALLOWED_TYPES = new Set(["cartRecovery", "marketing"]);

const renderPage = ({ ok, lang, message }) => {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const title = isAr ? "تفضيلات البريد" : "Email Preferences";
  const navy = "#002B5B";
  const bg = "#F7F8FB";
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:40px 16px;background:${bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:28px 32px;text-align:center;">
    <div style="font-size:48px;line-height:1;margin-bottom:8px;">${ok ? "✅" : "⚠️"}</div>
    <h1 style="margin:8px 0 14px;color:${navy};font-size:22px;font-weight:800;">${title}</h1>
    <p style="margin:0;color:#4B5563;font-size:15px;line-height:1.6;">${message}</p>
    <a href="https://belgmla.com" style="display:inline-block;margin-top:20px;color:#FF6A1A;text-decoration:none;font-weight:600;font-size:14px;">${isAr ? "العودة إلى المتجر" : "Back to the store"} →</a>
  </div>
</body></html>`;
};

/**
 * GET /api/emails/unsubscribe?token=...
 * One-click email opt-out. Token is a short JWT signed with JWT_SECRET that
 * encodes the user id and the preference key (cartRecovery / marketing).
 *
 * Also responds to POST with the same body — required by RFC 8058 List-
 * Unsubscribe-Post for native Gmail/Outlook one-click unsubscribe.
 */
export const unsubscribeEmail = controllerWrapper(
  "unsubscribeEmail",
  async (req, res) => {
    const token = req.query.token || req.body?.token;
    if (!token) {
      return res
        .status(400)
        .type("html")
        .send(renderPage({ ok: false, lang: "en", message: "Missing token." }));
    }

    let payload;
    try {
      payload = jwt.verify(String(token), process.env.JWT_SECRET);
    } catch {
      return res
        .status(400)
        .type("html")
        .send(
          renderPage({
            ok: false,
            lang: "en",
            message: "This unsubscribe link is invalid or has expired.",
          })
        );
    }

    const { uid, t: type } = payload || {};
    if (!uid || !ALLOWED_TYPES.has(type)) {
      return res
        .status(400)
        .type("html")
        .send(renderPage({ ok: false, lang: "en", message: "Malformed unsubscribe token." }));
    }

    const user = await User.findById(uid).select("lang emailPreferences email");
    if (!user) {
      return res
        .status(404)
        .type("html")
        .send(renderPage({ ok: false, lang: "en", message: "Account not found." }));
    }

    const lang = user.lang === "ar" ? "ar" : "en";

    await User.findByIdAndUpdate(uid, {
      $set: { [`emailPreferences.${type}`]: false },
    });

    const labels =
      type === "cartRecovery"
        ? {
            en: "You're unsubscribed from cart-reminder emails. You'll still receive order updates and account notifications.",
            ar: "تم إلغاء اشتراكك في تذكيرات سلة التسوّق. ستظل تتلقى تحديثات الطلبات وإشعارات الحساب.",
          }
        : {
            en: "You're unsubscribed from marketing emails. You'll still receive order updates and account notifications.",
            ar: "تم إلغاء اشتراكك في الرسائل التسويقية. ستظل تتلقى تحديثات الطلبات وإشعارات الحساب.",
          };

    return res
      .status(200)
      .type("html")
      .send(renderPage({ ok: true, lang, message: labels[lang] }));
  }
);
