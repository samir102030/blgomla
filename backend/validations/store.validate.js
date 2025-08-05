import { body, param, query, validationResult } from "express-validator";
import mongoose from "mongoose";

// Helper function to wrap validations with error handling
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

// Store ID validation (reusable)
const validateStoreId = validate([
  param("storeId")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid store ID format"),
]);

// Store CRUD Validations
export const validateCreateStore = validate([
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Store name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),

  body("email").optional().trim().isEmail().withMessage("Invalid email format"),

  body("phone")
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage("Invalid phone number"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("owner")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid owner ID format"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters"),

  body("logo")
    .optional()
    .trim()
    .isURL()
    .withMessage("Logo must be a valid URL"),
]);

export const validateUpdateStore = validate([
  ...validateStoreId._validations,

  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),

  body("email").optional().trim().isEmail().withMessage("Invalid email format"),

  body("phone")
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage("Invalid phone number"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters"),

  body("logo")
    .optional()
    .trim()
    .isURL()
    .withMessage("Logo must be a valid URL"),
]);

// Store Slider Validations
export const validateUpdateSlider = validate([
  ...validateStoreId._validations,

  body("slider")
    .isArray({ min: 1 })
    .withMessage("Slider must be an array with at least one item"),

  body("slider.*.image")
    .trim()
    .notEmpty()
    .withMessage("Image URL is required")
    .isURL()
    .withMessage("Image must be a valid URL"),

  body("slider.*.title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("slider.*.description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot exceed 200 characters"),
]);

// Social Link Validations
export const validateAddSocialLink = validate([
  ...validateStoreId._validations,

  body("platform")
    .trim()
    .notEmpty()
    .withMessage("Platform is required")
    .isLength({ max: 50 })
    .withMessage("Platform cannot exceed 50 characters"),

  body("url")
    .trim()
    .notEmpty()
    .withMessage("URL is required")
    .isURL()
    .withMessage("URL must be valid"),
]);

export const validateUpdateSocialLink = validate([
  ...validateStoreId._validations,

  param("linkId")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid link ID format"),

  body("platform")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Platform cannot exceed 50 characters"),

  body("url").optional().trim().isURL().withMessage("URL must be valid"),
]);

// Store Feature Validations
export const validateAddStoreFeature = validate([
  ...validateStoreId._validations,

  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot exceed 200 characters"),

  body("icon")
    .optional()
    .trim()
    .isURL()
    .withMessage("Icon must be a valid URL"),
]);

export const validateUpdateStoreFeature = validate([
  ...validateStoreId._validations,

  param("featureId")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid feature ID format"),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot exceed 200 characters"),

  body("icon")
    .optional()
    .trim()
    .isURL()
    .withMessage("Icon must be a valid URL"),
]);

// Achievement Validations
export const validateAddAchievement = validate([
  ...validateStoreId._validations,

  body("number")
    .isInt({ min: 1 })
    .withMessage("Number must be a positive integer"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
]);

export const validateUpdateAchievement = validate([
  ...validateStoreId._validations,

  param("achievementId")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid achievement ID format"),

  body("number")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Number must be a positive integer"),

  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
]);

// // Status Change Validations (activate/deactivate)
// export const validateStatusChange = validateStoreId;

// Export all validations
// export default {
//   validateCreateStore,
//   validateUpdateStore,
//   validateUpdateSlider,
//   validateAddSocialLink,
//   validateUpdateSocialLink,
//   validateAddStoreFeature,
//   validateUpdateStoreFeature,
//   validateAddAchievement,
//   validateUpdateAchievement,
//   validateStatusChange,
//   validateStoreId,
// };
