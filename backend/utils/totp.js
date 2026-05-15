// TOTP (RFC 6238) helpers for optional second-factor auth.
//
// otplib v13 removed the `authenticator` convenience export from the ESM
// build — we use the lower-level functional exports directly. Defaults
// (30-second step, SHA1, 6 digits) match what Google Authenticator /
// Authy / 1Password / Microsoft Authenticator expect.
//
// epochTolerance: 1 step on either side gives a ~90-second window total,
// so a user with slightly drifted phone time can still verify.

import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Belgomla";

export const generateTOTPSecret = () => generateSecret({ length: 20 });

export const buildOtpAuthUrl = (secret, accountLabel) =>
  generateURI({ secret, label: accountLabel, issuer: ISSUER });

export const buildQRCodeDataUrl = (otpauthUrl) => QRCode.toDataURL(otpauthUrl);

export const verifyTOTP = (secret, code) => {
  if (!secret || !code) return false;
  try {
    // verifySync returns { valid, delta, epoch, timeStep } — pull out .valid
    // explicitly so the caller gets a plain boolean.
    const result = verifySync({
      secret,
      token: String(code).trim(),
      epochTolerance: 1,
    });
    return result?.valid === true;
  } catch {
    return false;
  }
};
