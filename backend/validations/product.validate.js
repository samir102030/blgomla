import { body, param, query, validationResult } from "express-validator";

// Helper function to wrap validations + error handling
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

// Product CRUD Validations
export const validateCreateProduct = validate([
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("description").optional().trim(),
  body("price").isFloat({ gt: 0 }).withMessage("Price must be positive"),
  body("Category").optional().isMongoId(),
  body("brand").optional().isMongoId(),
  body("stock").optional().isInt({ min: 0 }),
  body("images.*.url").optional().isURL(),
  body("images.*.alt").optional().trim(),
  body("salePercentage").optional().isInt({ min: 0, max: 100 }),
  body("features").optional().isArray(),
  body("attributes").optional().isArray(),
  body("attributes.*.name").if(body("attributes").exists()).notEmpty(),
  body("attributes.*.value").if(body("attributes").exists()).notEmpty(),
]);

export const validateUpdateProduct = validate([
  param("productId").isMongoId(),
  body("name").optional().trim().notEmpty(),
  body("description").optional().trim(),
  body("price").optional().isFloat({ gt: 0 }),
  // ... include other fields as needed
]);

// ID Parameter Validation (reusable)
const validateProductId = validate([
  param("productId").isMongoId().withMessage("Invalid product ID"),
]);

// Stock Validation
export const validateUpdateStock = validate([
  param("productId").isMongoId(),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be positive integer"),
]);

// Review Validations
export const validateAddReview = validate([
  param("productId").isMongoId(),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
  body("comment").optional().trim(),
]);

export const validateUpdateReview = validate([
  param("productId").isMongoId(),
  param("reviewId").isMongoId(),
  body("rating").optional().isInt({ min: 1, max: 5 }),
  body("comment").optional().trim(),
]);

// Feature Validations
export const validateAddFeature = validate([
  param("productId").isMongoId(),
  body("feature").trim().notEmpty().withMessage("Feature text is required"),
]);

export const validateUpdateFeature = validate([
  param("productId").isMongoId(),
]);

// Attribute Validations
export const validateAddAttribute = validate([
  param("productId").isMongoId(),
  body("name").trim().notEmpty(),
  body("value").trim().notEmpty(),
]);

export const validateUpdateAttribute = validate([
  param("productId").isMongoId(),
  body("name").optional().trim().notEmpty(),
  body("value").optional().trim().notEmpty(),
]);

// Query Parameter Validations
export const validateGetAllProducts = validate([
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1 }),
  query("search").optional().trim(),
  query("categoryId").optional().isMongoId(),
  query("brandId").optional().isMongoId(),
  query("minPrice").optional().isFloat({ min: 0 }),
  query("maxPrice").optional().isFloat({ min: 0 }),
  query("rating").optional().isInt({ min: 1, max: 5 }),
]);

export const validateFilterProducts = validate([
  query("category").optional().isMongoId(),
  query("brand").optional().isMongoId(),
  query("minPrice").optional().isFloat({ min: 0 }),
  query("maxPrice").optional().isFloat({ min: 0 }),
  query("rating").optional().isInt({ min: 1, max: 5 }),
  query("attributes").optional().isJSON(),
]);
