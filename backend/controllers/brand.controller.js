import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

// Create Brand
export const createBrand = controllerWrapper(
  "createBrand",
  async (req, res) => {
    const { name, description, logo } = req.body;
    const brand = new Brand({ name, description, logo });
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
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });
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
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, message: "Brand deleted" });
  }
);

// Safe Delete Brand
export const safeDeleteBrand = controllerWrapper(
  "safeDeleteBrand",
  async (req, res) => {
    const { brandId } = req.params;
    const brand = await Brand.findByIdAndUpdate(
      brandId,
      { deleted: true },
      { new: true }
    );
    if (!brand)
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, message: "Brand marked as deleted" });
  }
);

// Set Brand to Product
export const setBrandToProduct = controllerWrapper(
  "setBrandToProduct",
  async (req, res) => {
    const { productId } = req.params;
    const { brandId } = req.body;
    const product = await Product.findByIdAndUpdate(
      productId,
      { brand: brandId },
      { new: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  }
);

// Get All Brands
export const getAllBrands = controllerWrapper(
  "getAllBrands",
  async (req, res) => {
    const brands = await Brand.find({ deleted: { $ne: true } });
    res.status(200).json({ success: true, brands });
  }
);

// Get Brand By Id
export const getBrandById = controllerWrapper(
  "getBrandById",
  async (req, res) => {
    const { brandId } = req.params;
    const brand = await Brand.findById(brandId);
    if (!brand || brand.deleted)
      return res
        .status(404)
        .json({ success: false, message: "Brand not found" });
    res.status(200).json({ success: true, brand });
  }
);
