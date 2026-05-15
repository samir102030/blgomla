// TOTP (RFC 6238) helpers for optional second-factor auth.
// Uses otplib's default 30-second step and SHA1 digest, which is what
// Google Authenticator / Authy / 1Password / Microsoft Authenticator
// expect. Tolerate ±1 step of clock skew (90s window total) so users
// with slightly drifted phones can still get in.

import { authenticator } from "otplib";
import QRCode from "qrcode";

authenticator.options = { window: 1 };

const ISSUER = "Belgomla";

export const generateTOTPSecret = () => authenticator.generateSecret();

export const buildOtpAuthUrl = (secret, accountLabel) =>
  authenticator.keyuri(accountLabel, ISSUER, secret);

export const buildQRCodeDataUrl = (otpauthUrl) =>
  QRCode.toDataURL(otpauthUrl);

export const verifyTOTP = (secret, code) => {
  if (!secret || !code) return false;
  try {
    return authenticator.check(String(code).trim(), secret);
  } catch {
    return false;
  }
};
