import { body, param, validationResult } from "express-validator";

const minPassword = 6;

// Predictable email normalization: just lowercase + trim. The default
// strips Gmail dots / +suffix which surprises users at login time.
const emailNormalizeOptions = {
  all_lowercase: true,
  gmail_remove_dots: false,
  gmail_remove_subaddress: false,
  outlookdotcom_remove_subaddress: false,
  yahoo_remove_subaddress: false,
  icloud_remove_subaddress: false,
};

// Helper: Combine validation + error handling. Returns the first error
// in `message` so the frontend (which reads response.data.message) shows
// something useful instead of a generic "failed" fallback.
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const first = errors.array()[0];
    res.status(400).json({
      success: false,
      message: first?.msg || "Validation failed",
      errors: errors.array(),
    });
  };
};

// Egyptian E.164: +20, then leading 1 (mobile prefix), then 9 digits.
// Examples: +201012345678, +201234567890. Landlines (which start with
// 2, 3, 8…) are not accepted — phone here is for SMS/WhatsApp reach.
const EG_PHONE_RE = /^\+201\d{9}$/;

export const validateSignup = validate([
  body("name").notEmpty().trim().withMessage("Name is required"),
  body("email").isEmail().withMessage("Invalid email").bail().normalizeEmail(emailNormalizeOptions),
  body("password")
    .isLength({ min: minPassword })
    .withMessage(`Password must be at least ${minPassword} characters`),
  body("phoneNumber")
    .notEmpty().withMessage("Phone number is required")
    .bail()
    .matches(EG_PHONE_RE)
    .withMessage("Phone number must be a valid Egyptian mobile in +201XXXXXXXXX format"),
]);

export const validateLogin = validate([
  body("email").isEmail().withMessage("Invalid email").bail().normalizeEmail(emailNormalizeOptions),
  body("password").notEmpty().withMessage("Password is required"),
]);

export const validateForgotPassword = validate([
  body("email").isEmail().withMessage("Invalid email").bail().normalizeEmail(emailNormalizeOptions),
]);

// Reset Password: Single middleware function
export const validateResetPassword = validate([
  param("token").notEmpty().withMessage("Token is required"),
  body("password")
    .isLength({ min: minPassword })
    .withMessage(`Password must be at least ${minPassword} characters`),
]);
