import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

// Create Category
export const createCategory = controllerWrapper(
  "createCategory",
  async (req, res) => {
    const { name, description } = req.body;
    const category = new Category({ name, description });
    await category.save();
    res.status(201).json({ success: true, category });
  }
);

// Get All Categories
export const getAllCategories = controllerWrapper(
  "getAllCategories",
  async (req, res) => {
    const categories = await Category.find({ deleted: { $ne: true } });
    res.status(200).json({ success: true, categories });
  }
);

// Get Category By Id
export const getCategoryById = controllerWrapper(
  "getCategoryById",
  async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category || category.deleted)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, category });
  }
);

// Update Category
export const updateCategory = controllerWrapper(
  "updateCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const updateData = req.body;
    const category = await Category.findByIdAndUpdate(categoryId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, category });
  }
);

// Delete Category (hard delete)
export const deleteCategory = controllerWrapper(
  "deleteCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndDelete(categoryId);
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, message: "Category deleted" });
  }
);

// Safe Delete Category
export const safeDeleteCategory = controllerWrapper(
  "safeDeleteCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { deleted: true },
      { new: true }
    );
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res
      .status(200)
      .json({ success: true, message: "Category marked as deleted" });
  }
);

// Restore Category
export const restoreCategory = controllerWrapper(
  "restoreCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { deleted: false },
      { new: true }
    );
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, message: "Category restored" });
  }
);

// Get Products By Category
export const getProductsByCategory = controllerWrapper(
  "getProductsByCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const products = await Product.find({
      Category: categoryId,
      deleted: { $ne: true },
    });
    res.status(200).json({ success: true, products });
  }
);

// Set Category to Product
export const setCategoryToProduct = controllerWrapper(
  "setCategoryToProduct",
  async (req, res) => {
    const { productId } = req.params;
    const { categoryId } = req.body;
    const product = await Product.findByIdAndUpdate(
      productId,
      { Category: categoryId },
      { new: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  }
);
