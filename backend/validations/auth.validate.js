import { body, param, validationResult } from "express-validator";

const minPassword = 6;
// Helper: Combine validation + error handling
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ errors: errors.array() });
  };
};

// Signup: Single middleware function
export const validateSignup = validate([
  body("name").notEmpty().trim().withMessage("Name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password")
    .isLength({ min: minPassword })
    .withMessage(`Password must be at least ${minPassword} characters`),
]);

// Login: Single middleware function
export const validateLogin = validate([
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Password is required"),
]);

// Forgot Password: Single middleware function
export const validateForgotPassword = validate([
  body("email").isEmail().normalizeEmail().withMessage("Invalid email"),
]);

// Reset Password: Single middleware function
export const validateResetPassword = validate([
  param("token").notEmpty().withMessage("Token is required"),
  body("password")
    .isLength({ min: minPassword })
    .withMessage(`Password must be at least ${minPassword} characters`),
]);
