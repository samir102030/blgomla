import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "Belgomla <noreply@belgomla.com>";

/**
 * Send a transactional email via Resend.
 * Falls back silently if RESEND_API_KEY is not configured.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.RESEND_API_KEY || !resend) {
    console.warn("[Email] RESEND_API_KEY not set — skipping email to", to);
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return null;
    }

    console.log("[Email] Sent successfully:", data?.id);
    return data;
  } catch (err) {
    console.error("[Email] Failed to send:", err.message);
    return null;
  }
};

/* ─────────────────────────────────────────────────
   EMAIL TEMPLATES
   ───────────────────────────────────────────────── */

const brandHeader = `
  <div style="background: #002b5b; padding: 24px 32px; text-align: center;">
    <h1 style="color: #ffd600; font-size: 28px; margin: 0; font-family: 'Inter', Arial, sans-serif;">
      Belgomla
    </h1>
  </div>
`;

const brandFooter = `
  <div style="background: #f7f8fb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 12px; margin: 0; font-family: 'Inter', Arial, sans-serif;">
      © ${new Date().getFullYear()} Belgomla. All rights reserved.
    </p>
  </div>
`;

/**
 * Welcome email sent after successful signup
 */
export const sendWelcomeEmail = async (user) => {
  const html = `
    ${brandHeader}
    <div style="padding: 32px; font-family: 'Inter', Arial, sans-serif; color: #111827;">
      <h2 style="color: #002b5b; margin-bottom: 16px;">Welcome to Belgomla, ${user.name}! 🎉</h2>
      <p>Thank you for creating your account. You're now part of Egypt's premier IT & networking marketplace.</p>
      ${
        user.verificationToken
          ? `<p>Your verification code is: <strong style="font-size: 20px; color: #002b5b; background: #ffd600; padding: 4px 12px; border-radius: 6px;">${user.verificationToken}</strong></p>`
          : ""
      }
      <p style="margin-top: 24px;">Happy shopping! 🛒</p>
    </div>
    ${brandFooter}
  `;
  return sendEmail({ to: user.email, subject: "Welcome to Belgomla! 🎉", html });
};

/**
 * Email verification code (resend)
 */
export const sendVerificationEmail = async (user) => {
  const html = `
    ${brandHeader}
    <div style="padding: 32px; font-family: 'Inter', Arial, sans-serif; color: #111827;">
      <h2 style="color: #002b5b;">Verify Your Email</h2>
      <p>Hi ${user.name}, here's your verification code:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="font-size: 32px; font-weight: 700; color: #002b5b; background: #ffd600; padding: 8px 24px; border-radius: 10px; letter-spacing: 4px;">
          ${user.verificationToken}
        </span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This code expires in 24 hours.</p>
    </div>
    ${brandFooter}
  `;
  return sendEmail({ to: user.email, subject: "Verify your Belgomla account", html });
};

/**
 * Password reset email with token
 */
export const sendPasswordResetEmail = async (user, resetToken, clientUrl) => {
  const resetLink = `${clientUrl || process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const html = `
    ${brandHeader}
    <div style="padding: 32px; font-family: 'Inter', Arial, sans-serif; color: #111827;">
      <h2 style="color: #002b5b;">Reset Your Password</h2>
      <p>Hi ${user.name}, we received a request to reset your password.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" style="display: inline-block; background: #002b5b; color: #ffd600; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
    ${brandFooter}
  `;
  return sendEmail({ to: user.email, subject: "Reset your Belgomla password", html });
};

/**
 * Order confirmation email
 */
export const sendOrderConfirmationEmail = async (user, order) => {
  const itemsList = order.orderItems
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${item.product?.name || "Product"}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.price.toFixed(2)} EGP</td>
        </tr>`
    )
    .join("");

  const html = `
    ${brandHeader}
    <div style="padding: 32px; font-family: 'Inter', Arial, sans-serif; color: #111827;">
      <h2 style="color: #002b5b;">Order Confirmed! ✅</h2>
      <p>Hi ${user.name}, your order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> has been placed successfully.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <thead>
          <tr style="background: #f3f5f9;">
            <th style="padding: 10px 12px; text-align: left; color: #6b7280;">Item</th>
            <th style="padding: 10px 12px; text-align: center; color: #6b7280;">Qty</th>
            <th style="padding: 10px 12px; text-align: right; color: #6b7280;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsList}</tbody>
      </table>

      <div style="background: #f3f5f9; padding: 16px; border-radius: 10px; margin-top: 16px;">
        ${order.couponDiscount > 0 ? `<p style="margin: 4px 0;"><strong>Coupon Discount:</strong> -${order.couponDiscount.toFixed(2)} EGP</p>` : ""}
        <p style="margin: 4px 0;"><strong>Shipping:</strong> ${order.shippingPrice.toFixed(2)} EGP</p>
        <p style="margin: 4px 0; font-size: 18px; color: #002b5b;"><strong>Total: ${order.totalPrice.toFixed(2)} EGP</strong></p>
      </div>

      <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Payment method: ${order.paymentMethod}</p>
    </div>
    ${brandFooter}
  `;
  return sendEmail({ to: user.email, subject: `Order Confirmed #${order._id.toString().slice(-8).toUpperCase()}`, html });
};

/**
 * Order status update email
 */
export const sendOrderStatusEmail = async (user, order, status) => {
  const statusLabels = {
    processing: { emoji: "⚙️", text: "is being processed" },
    shipped: { emoji: "🚚", text: "has been shipped" },
    delivered: { emoji: "✅", text: "has been delivered" },
    cancelled: { emoji: "❌", text: "has been cancelled" },
  };

  const info = statusLabels[status] || { emoji: "📦", text: "status has been updated" };

  const html = `
    ${brandHeader}
    <div style="padding: 32px; font-family: 'Inter', Arial, sans-serif; color: #111827;">
      <h2 style="color: #002b5b;">Order Update ${info.emoji}</h2>
      <p>Hi ${user.name}, your order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong> ${info.text}.</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; background: ${status === "cancelled" ? "#fef2f2" : "#ecfdf5"}; color: ${status === "cancelled" ? "#ef4444" : "#10b981"}; padding: 10px 24px; border-radius: 10px; font-weight: 600; font-size: 16px; text-transform: uppercase;">
          ${status}
        </span>
      </div>
    </div>
    ${brandFooter}
  `;
  return sendEmail({ to: user.email, subject: `Order ${status} — #${order._id.toString().slice(-8).toUpperCase()}`, html });
};

export default sendEmail;
