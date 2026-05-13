import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

// Create Brand
export const createBrand = controllerWrapper(
  "createBrand",
  async (req, res) => {
    const { name, nameAr, description, descriptionAr, logo, website, country, categories, metaTitle, metaDescription, sortOrder } = req.body;
    const brand = new Brand({ name, nameAr, description, descriptionAr, logo, website, country, categories, metaTitle, metaDescription, sortOrder });
    await brand.save();
    res.status(201).json({ success: true, brand });
  }
);

// Update Brand
export const updateBrand = controllerWrapper(
  "updateBrand",
  async (req, res) => {
    const { brandId } = req.params;
    const updateData = req.body;
    const brand = await Brand.findByIdAndUpdate(brandId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!brand)
      return res.status(404).json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, brand });
  }
);

// Delete Brand (hard delete)
export const deleteBrand = controllerWrapper(
  "deleteBrand",
  async (req, res) => {
    const { brandId } = req.params;
    const brand = await Brand.findByIdAndDelete(brandId);
    if (!brand)
      return res.status(404).json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, message: "Brand deleted" });
  }
);

// Safe Delete Brand
export const safeDeleteBrand = controllerWrapper(
  "safeDeleteBrand",
  async (req, res) => {
    const { brandId } = req.params;
    const brand = await Brand.findByIdAndUpdate(brandId, { deleted: true }, { new: true });
    if (!brand)
      return res.status(404).json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, message: "Brand marked as deleted" });
  }
);

// Restore Brand
export const restoreBrand = controllerWrapper(
  "restoreBrand",
  async (req, res) => {
    const { brandId } = req.params;
    const brand = await Brand.findByIdAndUpdate(brandId, { deleted: false }, { new: true });
    if (!brand)
      return res.status(404).json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, message: "Brand restored" });
  }
);

// Set Brand to Product
export const setBrandToProduct = controllerWrapper(
  "setBrandToProduct",
  async (req, res) => {
    const { productId } = req.params;
    const { brandId } = req.body;
    const product = await Product.findByIdAndUpdate(productId, { brand: brandId }, { new: true });
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  }
);

// Get All Brands (with aggregated product counts — no N+1)
export const getAllBrands = controllerWrapper(
  "getAllBrands",
  async (req, res) => {
    const brands = await Brand.find({ deleted: { $ne: true } })
      .populate("categories", "name slug")
      .sort({ sortOrder: 1, name: 1 });

    // Aggregate product counts in one query
    const counts = await Product.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id?.toString(), c.count]));

    const brandsWithCount = brands.map((brand) => ({
      ...brand.toObject(),
      productCount: countMap.get(brand._id.toString()) || 0,
    }));

    res.status(200).json({ success: true, brands: brandsWithCount });
  }
);

// Get Brand By Id
export const getBrandById = controllerWrapper(
  "getBrandById",
  async (req, res) => {
    const { brandId } = req.params;
    const brand = await Brand.findById(brandId).populate("categories", "name slug");
    if (!brand || brand.deleted)
      return res.status(404).json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, brand });
  }
);

// Get Brand By Slug (SEO)
export const getBrandBySlug = controllerWrapper(
  "getBrandBySlug",
  async (req, res) => {
    const { slug } = req.params;
    const brand = await Brand.findOne({ slug, deleted: { $ne: true } })
      .populate("categories", "name slug");
    if (!brand)
      return res.status(404).json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, brand });
  }
);

// Get Brands by Category (brands that have products in a given category)
export const getBrandsByCategory = controllerWrapper(
  "getBrandsByCategory",
  async (req, res) => {
    const { categoryId } = req.params;

    const brandIds = await Product.distinct("brand", {
      category: categoryId,
      deleted: { $ne: true },
      isActive: true,
    });

    const brands = await Brand.find({
      _id: { $in: brandIds },
      deleted: { $ne: true },
    }).sort({ sortOrder: 1, name: 1 });

    res.status(200).json({ success: true, brands });
  }
);
