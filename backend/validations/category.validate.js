import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

export const validateCreateCategory = [
  body("name").trim().notEmpty().withMessage("Category name is required"),
  body("description").optional().trim(),
  body("image").optional().trim(),
  body("icon").optional().trim(),
  body("parentCategory").optional().isMongoId().withMessage("Invalid parent category ID"),
  body("metaTitle").optional().trim(),
  body("metaDescription").optional().trim(),
  body("sortOrder").optional().isInt({ min: 0 }),
  handleValidationErrors,
];

export const validateUpdateCategory = [
  body("name").optional().trim().notEmpty().withMessage("Category name cannot be empty"),
  body("description").optional().trim(),
  body("image").optional().trim(),
  body("icon").optional().trim(),
  body("parentCategory").optional(),
  body("metaTitle").optional().trim(),
  body("metaDescription").optional().trim(),
  body("sortOrder").optional().isInt({ min: 0 }),
  handleValidationErrors,
];
