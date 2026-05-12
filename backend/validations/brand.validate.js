import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

export const validateCreateBrand = [
  body("name").trim().notEmpty().withMessage("Brand name is required"),
  body("description").optional().trim(),
  body("logo").optional().trim(),
  body("website").optional().trim().isURL().withMessage("Invalid website URL"),
  body("country").optional().trim(),
  body("categories").optional().isArray(),
  body("categories.*").optional().isMongoId().withMessage("Invalid category ID"),
  body("metaTitle").optional().trim(),
  body("metaDescription").optional().trim(),
  body("sortOrder").optional().isInt({ min: 0 }),
  handleValidationErrors,
];

export const validateUpdateBrand = [
  body("name").optional().trim().notEmpty().withMessage("Brand name cannot be empty"),
  body("description").optional().trim(),
  body("logo").optional().trim(),
  body("website").optional().trim(),
  body("country").optional().trim(),
  body("categories").optional().isArray(),
  body("categories.*").optional().isMongoId().withMessage("Invalid category ID"),
  body("metaTitle").optional().trim(),
  body("metaDescription").optional().trim(),
  body("sortOrder").optional().isInt({ min: 0 }),
  handleValidationErrors,
];
