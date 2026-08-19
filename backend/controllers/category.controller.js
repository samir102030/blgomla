import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { findByName } from "../utils/findOrCreateByName.js";
import { categoryFilterValue, wouldCreateCycle } from "../utils/categoryTree.js";
import { logAudit } from "../utils/audit.js";

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

    // Refuse a parent that sits beneath this category (or is it). Allowing it
    // would cut the whole branch loose from every root: it would vanish from
    // the menu while still existing, and each walk over the tree would need a
    // guard against looping. Rejecting it here keeps the shape a tree.
    if ("parentCategory" in req.body && req.body.parentCategory) {
      if (await wouldCreateCycle(categoryId, req.body.parentCategory)) {
        return res.status(400).json({
          success: false,
          message:
            "A category cannot be moved under itself or under one of its own subcategories",
        });
      }
    }

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

    const categoryFilter = await categoryFilterValue(categoryId);
    const products = await Product.find({
      category: categoryFilter,
      deleted: { $ne: true },
    })
      .populate("brand", "name slug logo")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments({
      category: categoryFilter,
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

/**
 * Move every product in one category into another.
 *
 * The single-product version above is fine for a correction; re-filing a
 * department after an import is thousands of rows, and doing that through the
 * table means ticking twenty at a time across sixty pages.
 *
 * `includeSubcategories` decides what "in this category" means. Off, it is the
 * products filed directly on it. On, it is the whole branch — which is what
 * "move Laptops into LAPTOP" almost always means, because in a tree three
 * levels deep the products hang off the leaves and the parent itself holds
 * none.
 *
 * `dryRun` returns the count without writing, so the confirmation an operator
 * sees is the number that is about to move rather than an estimate.
 */
export const moveCategoryProducts = controllerWrapper(
  "moveCategoryProducts",
  async (req, res) => {
    const { categoryId } = req.params;
    const { targetCategoryId, includeSubcategories = true, dryRun = false } = req.body;

    if (!targetCategoryId) {
      return res
        .status(400)
        .json({ success: false, message: "targetCategoryId is required" });
    }
    if (String(targetCategoryId) === String(categoryId)) {
      return res
        .status(400)
        .json({ success: false, message: "Source and target are the same category" });
    }

    const [source, target] = await Promise.all([
      Category.findById(categoryId),
      Category.findById(targetCategoryId),
    ]);
    if (!source)
      return res.status(404).json({ success: false, message: "Source category not found" });
    if (!target || target.deleted)
      return res.status(404).json({ success: false, message: "Target category not found" });

    // Moving a branch into its own descendant would file products under a
    // category that is about to be beneath them; refuse rather than tangle it.
    if (includeSubcategories && (await wouldCreateCycle(categoryId, targetCategoryId))) {
      return res.status(400).json({
        success: false,
        message: "Target sits inside the source category",
      });
    }

    const filter = {
      category: includeSubcategories
        ? await categoryFilterValue(categoryId)
        : source._id,
      deleted: { $ne: true },
    };

    const count = await Product.countDocuments(filter);
    if (dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        count,
        source: { _id: source._id, name: source.name },
        target: { _id: target._id, name: target.name },
      });
    }

    const result = await Product.updateMany(filter, { $set: { category: target._id } });

    logAudit(
      req,
      "category.productsMoved",
      "category",
      source._id,
      {
        sourceName: source.name,
        target: String(target._id),
        targetName: target.name,
        includeSubcategories,
        matched: result.matchedCount,
        moved: result.modifiedCount,
      },
      { category: "admin" }
    );

    res.status(200).json({
      success: true,
      moved: result.modifiedCount,
      matched: result.matchedCount,
      source: { _id: source._id, name: source.name },
      target: { _id: target._id, name: target.name },
    });
  }
);

// Get Brands in Category
export const getBrandsInCategory = controllerWrapper(
  "getBrandsInCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const brandIds = await Product.distinct("brand", {
      category: await categoryFilterValue(categoryId),
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
