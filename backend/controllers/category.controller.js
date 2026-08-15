import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { findByName } from "../utils/findOrCreateByName.js";

// Create Category
export const createCategory = controllerWrapper(
  "createCategory",
  async (req, res) => {
    const { name, nameAr, description, descriptionAr, image, icon, parentCategory, metaTitle, metaDescription, sortOrder } = req.body;

    // Same as brands: the name is uniquely indexed, so there is one category
    // by this name and re-adding it is not an error worth reporting as one.
    const existing = await findByName(Category, name);
    if (existing) {
      return res.status(200).json({
        success: true,
        category: existing,
        existed: true,
        message: `"${existing.name}" already exists — using it.`,
      });
    }

    const category = new Category({
      name, nameAr, description, descriptionAr, image, icon, parentCategory, metaTitle, metaDescription, sortOrder,
    });
    await category.save();

    // If it has a parent, add to parent's subCategories
    if (parentCategory) {
      await Category.findByIdAndUpdate(parentCategory, {
        $addToSet: { subCategories: category._id },
      });
    }

    res.status(201).json({ success: true, category });
  }
);

// Get All Categories (with aggregated product counts — no N+1)
export const getAllCategories = controllerWrapper(
  "getAllCategories",
  async (req, res) => {
    const categories = await Category.find({ deleted: { $ne: true } })
      .populate("parentCategory", "name nameAr slug")
      .populate("subCategories", "name nameAr slug")
      .sort({ sortOrder: 1, name: 1 });

    // Aggregate product counts in one query
    const counts = await Product.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id?.toString(), c.count]));

    const categoriesWithCount = categories.map((category) => ({
      ...category.toObject(),
      productCount: countMap.get(category._id.toString()) || 0,
    }));

    res.status(200).json({ success: true, data: categoriesWithCount });
  }
);

// Get Category Tree (nested structure for navigation)
export const getCategoryTree = controllerWrapper(
  "getCategoryTree",
  async (req, res) => {
    const categories = await Category.find({
      deleted: { $ne: true },
      isActive: true,
    })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Aggregate product counts
    const counts = await Product.aggregate([
      { $match: { deleted: { $ne: true }, isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id?.toString(), c.count]));

    // Build tree in-memory
    const byId = new Map();
    const roots = [];

    categories.forEach((cat) => {
      cat.productCount = countMap.get(cat._id.toString()) || 0;
      cat.children = [];
      byId.set(cat._id.toString(), cat);
    });

    categories.forEach((cat) => {
      if (cat.parentCategory) {
        const parent = byId.get(cat.parentCategory.toString());
        if (parent) parent.children.push(cat);
        else roots.push(cat); // orphan → treat as root
      } else {
        roots.push(cat);
      }
    });

    res.status(200).json({ success: true, tree: roots });
  }
);

// Get Category By Id
export const getCategoryById = controllerWrapper(
  "getCategoryById",
  async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId)
      .populate("parentCategory", "name nameAr slug")
      .populate("subCategories", "name nameAr slug");
    if (!category || category.deleted)
      return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, data: category });
  }
);

// Get Category By Slug (SEO)
export const getCategoryBySlug = controllerWrapper(
  "getCategoryBySlug",
  async (req, res) => {
    const { slug } = req.params;
    const category = await Category.findOne({ slug, deleted: { $ne: true } })
      .populate("parentCategory", "name nameAr slug")
      .populate("subCategories", "name nameAr slug");
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, data: category });
  }
);

// Update Category
export const updateCategory = controllerWrapper(
  "updateCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });

    // Handle parent change
    const oldParent = category.parentCategory?.toString();
    Object.assign(category, req.body);
    await category.save();

    const newParent = category.parentCategory?.toString();
    if (oldParent !== newParent) {
      // Remove from old parent
      if (oldParent) {
        await Category.findByIdAndUpdate(oldParent, {
          $pull: { subCategories: category._id },
        });
      }
      // Add to new parent
      if (newParent) {
        await Category.findByIdAndUpdate(newParent, {
          $addToSet: { subCategories: category._id },
        });
      }
    }

    res.status(200).json({ success: true, data: category });
  }
);

// Hard Delete Category
export const deleteCategory = controllerWrapper(
  "deleteCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndDelete(categoryId);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });

    // Remove from parent
    if (category.parentCategory) {
      await Category.findByIdAndUpdate(category.parentCategory, {
        $pull: { subCategories: category._id },
      });
    }
    res.status(200).json({ success: true, message: "Category deleted" });
  }
);

// Safe Delete Category
export const safeDeleteCategory = controllerWrapper(
  "safeDeleteCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndUpdate(categoryId, { deleted: true }, { new: true });
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, message: "Category soft deleted" });
  }
);

// Restore Category
export const restoreCategory = controllerWrapper(
  "restoreCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const category = await Category.findByIdAndUpdate(categoryId, { deleted: false }, { new: true });
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, message: "Category restored" });
  }
);

// Get Products By Category
export const getProductsByCategory = controllerWrapper(
  "getProductsByCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const products = await Product.find({
      category: categoryId,
      deleted: { $ne: true },
    })
      .populate("brand", "name slug logo")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments({
      category: categoryId,
      deleted: { $ne: true },
    });

    res.status(200).json({
      success: true,
      data: products,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
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
      { category: categoryId },
      { new: true }
    );
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  }
);

// Get Brands in Category
export const getBrandsInCategory = controllerWrapper(
  "getBrandsInCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const brandIds = await Product.distinct("brand", {
      category: categoryId,
      deleted: { $ne: true },
      isActive: true,
    });

    const Brand = (await import("../models/brand.model.js")).default;
    const brands = await Brand.find({
      _id: { $in: brandIds },
      deleted: { $ne: true },
    }).sort({ sortOrder: 1, name: 1 });

    res.status(200).json({ success: true, brands });
  }
);
