// Provider-agnostic SMS sender. No-ops until SMS_PROVIDER + credentials are set,
// so the app runs unchanged without it. Supports Twilio and Vonage (Nexmo);
// both are widely available in Egypt. Add more providers in the switch below.
const provider = (process.env.SMS_PROVIDER || "").toLowerCase();

const sendViaTwilio = async (to, body) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return null;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    }
  );
  if (!res.ok) throw new Error(`Twilio ${res.status}`);
  return res.json();
};

const sendViaVonage = async (to, body) => {
  const key = process.env.VONAGE_API_KEY;
  const secret = process.env.VONAGE_API_SECRET;
  const from = process.env.VONAGE_FROM || "Belgomla";
  if (!key || !secret) return null;
  const res = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      api_key: key,
      api_secret: secret,
      to: to.replace(/^\+/, ""),
      from,
      text: body,
    }),
  });
  if (!res.ok) throw new Error(`Vonage ${res.status}`);
  return res.json();
};

/**
 * Send an SMS. Returns null (no-op) when SMS isn't configured; never throws to
 * callers — failures are logged so a flaky gateway can't break an order flow.
 */
export const sendSMS = async (to, body) => {
  if (!provider || !to) return null;
  try {
    switch (provider) {
      case "twilio":
        return await sendViaTwilio(to, body);
      case "vonage":
        return await sendViaVonage(to, body);
      default:
        console.warn(`[SMS] Unknown SMS_PROVIDER "${provider}" — skipping`);
        return null;
    }
  } catch (err) {
    console.error("[SMS] send failed:", err.message);
    return null;
  }
};

// Short bilingual order messages. Kept terse — SMS is charged per segment.
export const orderSmsText = (lang, kind, orderNum) => {
  const ar = {
    confirmed: `بلجملة: تم استلام طلبك #${orderNum}. شكراً لك!`,
    shipped: `بلجملة: تم شحن طلبك #${orderNum} وهو في الطريق إليك.`,
    delivered: `بلجملة: تم توصيل طلبك #${orderNum}. نتمنى لك تجربة سعيدة!`,
  };
  const en = {
    confirmed: `Belgomla: Order #${orderNum} received. Thank you!`,
    shipped: `Belgomla: Order #${orderNum} has shipped and is on its way.`,
    delivered: `Belgomla: Order #${orderNum} delivered. Enjoy!`,
  };
  return (lang === "ar" ? ar : en)[kind] || "";
};
