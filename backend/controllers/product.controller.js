import Product from "../models/product.model.js";
import { ANY_AUDIENCE, isElectronicsCategory } from "../utils/electronicsVisibility.js";
import { scopedCategoryIds } from "../utils/categoryScope.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { paginateQuery } from "../utils/pagination.js";
import { paginateProducts } from "../utils/productPagination.js";
import User from "../models/user.model.js";
import Brand from "../models/brand.model.js";
import Category from "../models/category.model.js";
import Notification from "../models/notification.model.js";
import BrandRequest from "../models/brandRequest.model.js";
import CategoryRequest from "../models/categoryRequest.model.js";
import Order from "../models/order.model.js";
import { logEventSafe } from "./event.controller.js";
import { logAudit, diff } from "../utils/audit.js";
import { categoryFilterValue } from "../utils/categoryTree.js";
import mongoose from "mongoose";

// Tokenized, case-insensitive search filter: every word must appear in the
// name, tags, or description (order-independent). Beats a single contiguous
// regex for multi-word queries like "hikvision 4mp camera". Returns a Mongo
// `$and` array, or null when there's nothing to search.
// NOTE: true typo tolerance (e.g. "hikvison" → "hikvision") needs MongoDB
// Atlas Search with a fuzzy index — a documented follow-up; not active here.
const buildSearchFilter = (search) => {
  const tokens = String(search || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (tokens.length === 0) return null;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tokens.map((tok) => {
    const rx = new RegExp(esc(tok), "i");
    return {
      $or: [
        { name: { $regex: rx } },
        { nameAr: { $regex: rx } },
        { description: { $regex: rx } },
        { descriptionAr: { $regex: rx } },
        { tags: { $in: [rx] } },
      ],
    };
  });
};

const normalizeBulkPricing = (bulkPricing = []) => {
  if (!Array.isArray(bulkPricing)) return [];
  const cleaned = bulkPricing
    .map((rule) => ({
      minQty: Number(rule?.minQty),
      unitPrice: Number(rule?.unitPrice),
    }))
    .filter(
      (rule) =>
        Number.isFinite(rule.minQty) &&
        Number.isFinite(rule.unitPrice) &&
        rule.minQty >= 1 &&
        rule.unitPrice > 0
    );

  const uniqueByMinQty = new Map();
  for (const rule of cleaned) {
    uniqueByMinQty.set(rule.minQty, rule);
  }

  return Array.from(uniqueByMinQty.values()).sort(
    (a, b) => a.minQty - b.minQty
  );
};

// Create Product
export const createProduct = controllerWrapper(
  "createProduct",
  async (req, res) => {
    const { newBrand, newCategory, bulkPricing, ...productData } = req.body;
    if (bulkPricing !== undefined) {
      productData.bulkPricing = normalizeBulkPricing(bulkPricing);
    }
    const product = new Product(productData);
    product.createdBy = req.user._id;

    if (req.user.role === "store") {
      product.approvalStatus = "pending";
      product.isActive = false;
    } else {
      product.approvalStatus = "approved";
      product.isActive = true;
      product.approvedBy = req.user._id;
      product.approvedAt = new Date();
    }

    let hasPendingRequests = false;
    const userId = req.user._id;

    // Handle new brand request
    if (newBrand && newBrand.name) {
      const brandRequest = new BrandRequest({
        name: newBrand.name,
        description: newBrand.description,
        requestedBy: userId,
        store: productData.store,
        product: product._id,
        status: "pending",
      });
      await brandRequest.save();

      product.pendingBrandRequest = brandRequest._id;
      hasPendingRequests = true;

      // Notify all admin users
      const admins = await User.find({
        role: { $in: ["admin", "super_admin"] },
      });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: "New Brand Request",
          message: `Vendor requested to create a new brand: "${newBrand.name}" for product "${product.name}"`,
          type: "brand_request",
        });
      }
    }

    // Handle new category request
    if (newCategory && newCategory.name) {
      const categoryRequest = new CategoryRequest({
        name: newCategory.name,
        description: newCategory.description,
        requestedBy: userId,
        store: productData.store,
        product: product._id,
        status: "pending",
      });
      await categoryRequest.save();

      product.pendingCategoryRequest = categoryRequest._id;
      hasPendingRequests = true;

      // Notify all admin users
      const admins = await User.find({
        role: { $in: ["admin", "super_admin"] },
      });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: "New Category Request",
          message: `Vendor requested to create a new category: "${newCategory.name}" for product "${product.name}"`,
          type: "category_request",
        });
      }
    }

    // Set product status based on pending requests
    product.hasPendingRequests = hasPendingRequests;
    if (hasPendingRequests) {
      product.isActive = false; // Product won't be published until approved
    }

    await product.save();

    // Create notification for store owner
    const store = await mongoose
      .model("Store")
      .findById(product.store)
      .populate("owner");
    if (store && store.owner) {
      const message = hasPendingRequests
        ? `Your product "${product.name}" has been created and is pending admin approval for new brand/category`
        : `Your product "${product.name}" has been added successfully`;

      await Notification.create({
        user: store.owner._id,
        title: "New Product Added",
        message,
        type: "product",
      });
    }

    logAudit(req, "product.created", "product", product._id, {
      name: product.name,
      approvalStatus: product.approvalStatus,
    }, { category: "admin" });

    res.status(201).json({ success: true, product });
  }
);

// Get All Products (with optional filters/search)
export const getAllProducts = controllerWrapper(
  "getAllProducts",
  async (req, res) => {
    const { page = 1, limit = 20, search, ...filters } = req.query;
    const filter = {};
    const searchAnd = buildSearchFilter(search);
    if (searchAnd) filter.$and = searchAnd;
    // Searching by name reaches the unpublished section; browsing does not.
    if (searchAnd) filter.audience = ANY_AUDIENCE;

    // Ask for one side of the shop and get exactly that.
    //
    // The dashboard uses this: its general product list is about the general
    // catalogue, and the electronics section has a page of its own. Without it
    // the two are one list of twelve thousand rows that nobody can work in.
    // Set last, so it beats the search clause above rather than the other way
    // round — a search inside one section stays inside it.
    if (filters.audience === "public") filter.audience = { $ne: "electronics" };
    else if (filters.audience === "electronics") filter.audience = "electronics";
    // Ids arrive as strings and this listing runs through an aggregation,
    // which does not cast them the way a schema-backed find() does. Left as
    // strings they match nothing at all — quietly, with a 200 and an empty
    // page — which is what ?categoryId= had been doing to every caller.
    const asId = (value) =>
      mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(String(value)) : value;

    // A category means the branch under it, not the products filed on the
    // category itself. Roots hold almost nothing directly — every product
    // hangs off a leaf — so an exact match turned "show me Electronics" into
    // an empty page, which is what the person put in charge of Electronics
    // saw when they picked their own section. The storefront listing has
    // expanded the branch all along; this one never did.
    if (filters.categoryId) {
      const branch = await categoryFilterValue(filters.categoryId);
      filter.category = branch?.$in ? { $in: branch.$in.map(asId) } : asId(branch);
    }

    // A scoped account is shown its own part of the catalogue and no more.
    // Applied last so it narrows whatever was asked for rather than being
    // narrowed by it — a category filter naming somebody else's branch ends
    // up matching nothing, which is the correct answer.
    // A signed-in caller here is the dashboard — the public listing has no
    // session — and staff manage every section of the shop, including the one
    // the storefront keeps out of its own listings.
    if (req.user) filter.audience = ANY_AUDIENCE;

    const allowedIds = await scopedCategoryIds(req.user);
    if (allowedIds) {
      // Whatever was asked for, kept only where it overlaps the branch this
      // account owns. Reading `filter.category` has to cope with both shapes
      // the line above can leave behind — one id, or the $in of a branch.
      const asked = filter.category
        ? (filter.category.$in || [filter.category]).map(String)
        : null;
      const kept = asked
        ? asked.filter((id) => allowedIds.has(id))
        : [...allowedIds];
      filter.category = { $in: kept.map(asId) };
    }
    // Choosing a category inside the branch is the other way in. Without this
    // the category page renders its own products as an empty list.
    if (await isElectronicsCategory(filters.categoryId)) filter.audience = ANY_AUDIENCE;
    if (filters.brandId) filter.brand = asId(filters.brandId);
    if (filters.storeId) filter.store = asId(filters.storeId);
    // Booleans arrive as the strings "true"/"false" via query params; coerce
    // so Mongo matches the actual Boolean field type.
    const toBool = (v) => (v === true || v === "true");
    if (filters.isActive !== undefined) filter.isActive = toBool(filters.isActive);
    if (filters.featured !== undefined) filter.featured = toBool(filters.featured);
    if (filters.saleActive !== undefined) filter.saleActive = toBool(filters.saleActive);
    if (filters.deleted !== undefined) filter.deleted = toBool(filters.deleted);
    if (filters.approvalStatus) filter.approvalStatus = filters.approvalStatus;
    if (filters.minPrice || filters.maxPrice) {
      filter.price = {};
      if (filters.minPrice) filter.price.$gte = Number(filters.minPrice);
      if (filters.maxPrice) filter.price.$lte = Number(filters.maxPrice);
    }

    const result = await paginateProducts({
      filter,
      // For searches, rank by popularity/quality; otherwise newest first.
      sort: search ? { soldCount: -1, rating: -1 } : { createdAt: -1 },
      page,
      limit,
    });
    // Capture demand we couldn't satisfy — gold for stocking decisions.
    if (search && result.total === 0) {
      logEventSafe({ type: "search_no_results", query: String(search) });
    }
    res.status(200).json(result);
  }
);

// Search suggestions (instant autocomplete): lightweight, multi-section.
// Returns top matching products + brands + categories for the header
// search-as-you-type dropdown. Kept separate from getAllProducts so the
// payload stays tiny (no facets, no pagination, projection-limited) and the
// query path is optimized for sub-100ms response on every keystroke.
export const getSearchSuggestions = controllerWrapper(
  "getSearchSuggestions",
  async (req, res) => {
    const raw = String(req.query.q ?? req.query.search ?? "").trim();
    // Require 2+ chars so a single letter doesn't scan the whole catalog.
    if (raw.length < 2) {
      return res
        .status(200)
        .json({ success: true, products: [], brands: [], categories: [] });
    }

    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tokens = raw.split(/\s+/).filter(Boolean).slice(0, 6);
    const rxs = tokens.map((tok) => new RegExp(esc(tok), "i"));

    // Products: every token must hit name / nameAr / tags (AND across tokens,
    // OR across fields) — same multi-word logic as buildSearchFilter but
    // extended to the Arabic name so AR queries match too.
    const productFilter = {
      isActive: true,
      deleted: { $ne: true },
      approvalStatus: "approved",
      // Same rule as the full search: typing a name finds the product even
      // while its section is unpublished.
      audience: ANY_AUDIENCE,
      $and: rxs.map((rx) => ({
        $or: [{ name: rx }, { nameAr: rx }, { tags: { $in: [rx] } }],
      })),
    };

    // Brands/categories: match any token on name or nameAr.
    const orNameFilter = {
      $or: rxs.flatMap((rx) => [{ name: rx }, { nameAr: rx }]),
    };

    const [products, brands, categories] = await Promise.all([
      Product.find(productFilter)
        .select("name nameAr slug price salePrice saleActive images")
        .sort({ soldCount: -1, rating: -1 })
        .limit(6)
        .lean(),
      Brand.find(orNameFilter).select("name nameAr slug logo").limit(4).lean(),
      // Products are findable while their section is unpublished; the section
      // itself is not something to suggest browsing into.
      Category.find({ ...orNameFilter, isActive: true }).select("name nameAr slug").limit(4).lean(),
    ]);

    // Slim products to a single image so the dropdown payload stays small.
    const slimProducts = products.map((p) => ({
      _id: p._id,
      name: p.name,
      nameAr: p.nameAr,
      slug: p.slug,
      price: p.price,
      salePrice: p.salePrice,
      saleActive: p.saleActive,
      image: p.images?.[0]?.url ?? null,
    }));

    res
      .status(200)
      .json({ success: true, products: slimProducts, brands, categories });
  }
);

// Get Sale Products
export const getSaleProducts = controllerWrapper(
  "getsaleProducts",
  async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await paginateProducts({
      filter: { saleActive: true, isActive: true, deleted: false },
      sort: { createdAt: -1 },
      page,
      limit,
    });
    res.status(200).json(result);
  }
);

// Get Product By Id
export const getProductById = controllerWrapper(
  "getProductById",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId)
      .populate("brand", "name slug logo")
      .populate("category", "name nameAr slug")
      .populate("store", "storeName logo")
      .populate("reviews.user", "name");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, data: product });
  }
);

// Get Product By Slug (SEO-friendly)
export const getProductBySlug = controllerWrapper(
  "getProductBySlug",
  async (req, res) => {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, deleted: { $ne: true } })
      .populate("brand", "name slug logo")
      .populate("category", "name nameAr slug")
      .populate("store", "storeName logo")
      .populate("reviews.user", "name");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, data: product });
  }
);

// Bulk Update Products (admin)
export const bulkUpdateProducts = controllerWrapper(
  "bulkUpdateProducts",
  async (req, res) => {
    const { ids, updateData } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "ids array is required" });
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "updateData is required" });
    }

    // Whitelist allowed bulk-update fields
    const allowed = [
      "price", "stock", "isActive", "featured", "saleActive",
      "salePercentage", "category", "brand", "minOrderQty",
    ];
    const sanitized = {};
    for (const key of allowed) {
      if (updateData[key] !== undefined) sanitized[key] = updateData[key];
    }

    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: sanitized }
    );

    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  }
);

// Storefront Products (optimized public endpoint with facets)
export const getStorefrontProducts = controllerWrapper(
  "getStorefrontProducts",
  async (req, res) => {
    const {
      page = 1, limit = 20, search, category, brand,
      minPrice, maxPrice, rating, sortBy, inStock, onSale, featured,
    } = req.query;

    const query = {
      isActive: true,
      deleted: false,
      approvalStatus: "approved",
    };

    const searchAnd = buildSearchFilter(search);
    if (searchAnd) query.$and = searchAnd;
    if (searchAnd) query.audience = ANY_AUDIENCE;
    // A category selected from the menu may be a branch rather than a leaf, and
    // products hang off the leaves. Matching the subtree is what makes clicking
    // "Laptop" show laptops instead of an empty page.
    // The sidebar lets several categories and several brands be ticked at
    // once, so both arrive as comma-separated lists. One value is the same
    // thing with a list of one.
    const list = (v) =>
      String(v || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

    const categoryIds = list(category);
    if (categoryIds.length) {
      // Each selection is expanded to its own subtree first — picking a branch
      // has to mean everything under it — and the results are pooled.
      const expanded = await Promise.all(categoryIds.map((id) => categoryFilterValue(id)));
      const pool = expanded.flatMap((value) =>
        value && value.$in ? value.$in : [String(value)],
      );
      query.category = pool.length === 1 ? pool[0] : { $in: [...new Set(pool)] };

      const inBranch = await Promise.all(categoryIds.map((id) => isElectronicsCategory(id)));
      if (inBranch.some(Boolean)) query.audience = ANY_AUDIENCE;
    }

    const brandIds = list(brand);
    if (brandIds.length) query.brand = brandIds.length === 1 ? brandIds[0] : { $in: brandIds };
    if (inStock === "true") query.stock = { $gt: 0 };
    // The catalogue page offers these two beside "In stock", and they were the
    // only filters it could not hand to the server.
    if (featured === "true") query.featured = true;
    if (onSale === "true") {
      query.saleActive = true;
      query.salePercentage = { $gt: 0 };
    }
    if (rating) query.rating = { $gte: Number(rating) };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sort options — searches default to popularity/quality ranking.
    let sortOption = search && !sortBy ? { soldCount: -1, rating: -1 } : { createdAt: -1 };
    switch (sortBy) {
      case "price_asc": sortOption = { price: 1 }; break;
      case "price_desc": sortOption = { price: -1 }; break;
      case "newest": sortOption = { createdAt: -1 }; break;
      case "best_selling": sortOption = { soldCount: -1 }; break;
      case "top_rated": sortOption = { rating: -1 }; break;
      case "name_asc": sortOption = { name: 1 }; break;
      case "name_desc": sortOption = { name: -1 }; break;
    }

    const mongooseQuery = Product.find(query)
      .populate("brand", "name slug logo")
      .populate("category", "name nameAr slug")
      .sort(sortOption);

    const result = await paginateQuery(page, limit, mongooseQuery);

    // Get facets (available filters) in parallel
    const [brandFacets, categoryFacets, priceRange] = await Promise.all([
      Product.aggregate([
        { $match: { ...query, brand: { $exists: true, $ne: null } } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
      ]),
      Product.aggregate([
        { $match: { ...query, category: { $exists: true, $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      Product.aggregate([
        { $match: query },
        { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
      ]),
    ]);

    if (search && result.total === 0) {
      logEventSafe({ type: "search_no_results", query: String(search) });
    }

    res.status(200).json({
      ...result,
      facets: {
        brands: brandFacets,
        categories: categoryFacets,
        priceRange: priceRange[0] || { min: 0, max: 0 },
      },
    });
  }
);

// Update Product
export const updateProduct = controllerWrapper(
  "updateProduct",
  async (req, res) => {
    const { productId } = req.params;
    const updateData = req.body;
    if (updateData.bulkPricing !== undefined) {
      updateData.bulkPricing = normalizeBulkPricing(updateData.bulkPricing);
    }

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const auditFields = [
      "name",
      "price",
      "stock",
      "isActive",
      "approvalStatus",
      "saleActive",
      "salePercentage",
      "category",
      "brand",
    ];
    const snap = (p) =>
      auditFields.reduce((o, f) => {
        o[f] = p?.[f]?.toString?.() ?? p?.[f];
        return o;
      }, {});
    const beforeSnap = snap(product);

    if (req.user.role === "store") {
      // Vendors cannot self-approve or publish directly
      delete updateData.isActive;
      delete updateData.approvalStatus;
      delete updateData.approvalNotes;
      delete updateData.approvedBy;
      delete updateData.approvedAt;

      Object.assign(product, updateData);
      product.approvalStatus = "pending";
      product.isActive = false;
      product.approvedBy = undefined;
      product.approvedAt = undefined;
      product.approvalNotes = undefined;

      await product.save();
      logAudit(req, "product.updated", "product", product._id, { name: product.name }, {
        changes: diff(beforeSnap, snap(product), auditFields),
        category: "admin",
      });
      return res.status(200).json({ success: true, product });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    logAudit(req, "product.updated", "product", updatedProduct._id, {
      name: updatedProduct.name,
    }, {
      changes: diff(beforeSnap, snap(updatedProduct), auditFields),
      category: "admin",
    });
    res.status(200).json({ success: true, product: updatedProduct });
  }
);

export const getProductApprovals = controllerWrapper(
  "getProductApprovals",
  async (req, res) => {
    const { status = "pending", page = 1, limit = 20, storeId } = req.query;
    const query = {
      deleted: false,
    };

    if (status !== "all") query.approvalStatus = status;
    if (storeId) query.store = storeId;

    const mongooseQuery = Product.find(query)
      .populate("store")
      .populate("brand")
      .populate("category")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

export const approveProduct = controllerWrapper(
  "approveProduct",
  async (req, res) => {
    const { productId } = req.params;
    const { note } = req.body || {};

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    product.approvalStatus = "approved";
    product.isActive = true;
    product.approvedBy = req.user._id;
    product.approvedAt = new Date();
    product.approvalNotes = note;

    await product.save();

    // Notify store owner
    const store = await mongoose.model("Store").findById(product.store).populate("owner");
    if (store?.owner) {
      await Notification.create({
        user: store.owner._id,
        title: "Product Approved",
        message: `Your product "${product.name}" has been approved and published`,
        type: "product_approval",
      });
    }

    logAudit(req, "product.approved", "product", product._id, { name: product.name, note });
    res.status(200).json({ success: true, product });
  }
);

export const rejectProduct = controllerWrapper(
  "rejectProduct",
  async (req, res) => {
    const { productId } = req.params;
    const { reason } = req.body || {};

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    product.approvalStatus = "rejected";
    product.isActive = false;
    product.approvedBy = req.user._id;
    product.approvedAt = new Date();
    product.approvalNotes = reason || "No reason provided";

    await product.save();

    // Notify store owner
    const store = await mongoose.model("Store").findById(product.store).populate("owner");
    if (store?.owner) {
      await Notification.create({
        user: store.owner._id,
        title: "Product Rejected",
        message: `Your product "${product.name}" was rejected. Reason: ${product.approvalNotes}`,
        type: "product_approval",
      });
    }

    logAudit(req, "product.rejected", "product", product._id, { name: product.name, reason });
    res.status(200).json({ success: true, product });
  }
);

// Delete Product (hard delete)
export const deleteProduct = controllerWrapper(
  "deleteProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findByIdAndDelete(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    logAudit(req, "product.deleted", "product", productId, { name: product.name });
    res.status(200).json({ success: true, message: "Product deleted" });
  }
);

// Soft Delete Product
export const softDeleteProduct = controllerWrapper(
  "softDeleteProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findByIdAndUpdate(
      productId,
      { deleted: true },
      { new: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res
      .status(200)
      .json({ success: true, message: "Product marked as deleted" });
    logAudit(req, "product.archived", "product", req.params.productId);
  }
);

// Restore Product
export const restoreProduct = controllerWrapper(
  "restoreProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findByIdAndUpdate(
      productId,
      { deleted: false },
      { new: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    logAudit(req, "product.restored", "product", req.params.productId);
    res.status(200).json({ success: true, message: "Product restored" });
  }
);

// Toggle Sale Status
export const toggleSaleProduct = controllerWrapper(
  "toggleSaleProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.saleActive = !product.saleActive;
    logAudit(req, "product.sale_toggled", "product", product._id, { saleActive: product.saleActive });
    await product.save();
    res.status(200).json({ success: true, saleActive: product.saleActive });
  }
);

// Schedule a flash sale: set percentage + optional start/end window. The
// sale-scheduler cron flips saleActive across the window, but we also resolve
// the current state immediately so the change is visible without waiting.
export const scheduleSale = controllerWrapper(
  "scheduleSale",
  async (req, res) => {
    const { productId } = req.params;
    const { salePercentage, saleStartsAt, saleEndsAt, clear } = req.body;

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    if (clear) {
      product.saleActive = false;
      product.salePercentage = 0;
      product.saleStartsAt = null;
      product.saleEndsAt = null;
      await product.save();
      return res.status(200).json({ success: true, product });
    }

    const pct = Number(salePercentage);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return res.status(400).json({
        success: false,
        message: "salePercentage must be between 1 and 100",
      });
    }

    const start = saleStartsAt ? new Date(saleStartsAt) : null;
    const end = saleEndsAt ? new Date(saleEndsAt) : null;
    if (start && isNaN(start.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid saleStartsAt" });
    }
    if (end && isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid saleEndsAt" });
    }
    if (start && end && end <= start) {
      return res.status(400).json({
        success: false,
        message: "saleEndsAt must be after saleStartsAt",
      });
    }

    product.salePercentage = pct;
    product.saleStartsAt = start;
    product.saleEndsAt = end;

    // Resolve current state: active when now is within [start, end).
    const now = Date.now();
    const started = !start || start.getTime() <= now;
    const notEnded = !end || end.getTime() > now;
    product.saleActive = started && notEnded;

    await product.save();
    res.status(200).json({ success: true, product });
  }
);

// Toggle Featured Status
export const toggleFeaturedProduct = controllerWrapper(
  "toggleFeaturedProduct",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.featured = !product.featured;
    logAudit(req, "product.featured_toggled", "product", product._id, { featured: product.featured });
    await product.save();
    res.status(200).json({ success: true, featured: product.featured });
  }
);

// Update Product Stock
export const updateProductStock = controllerWrapper(
  "updateProductStock",
  async (req, res) => {
    const { productId } = req.params;
    const { stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      productId,
      { stock },
      { new: true, runValidators: true }
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    logAudit(req, "product.stock_updated", "product", productId, { stock });
    res.status(200).json({ success: true, product });
  }
);

// Filter Products
export const filterProducts = controllerWrapper(
  "filterProducts",
  async (req, res) => {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      featured,
      saleActive,
      store,
      attributes,
      page = 1,
      limit = 20,
    } = req.query;
    let query = {};
    if (category) query.category = await categoryFilterValue(category);
    if (brand) query.brand = brand;
    if (store) query.store = store;
    if (featured !== undefined) query.featured = featured;
    if (saleActive !== undefined) query.saleActive = saleActive;
    if (rating) query.rating = { $gte: Number(rating) };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    // Filter by attributes (array of {name, value})
    if (attributes) {
      try {
        const attrs = JSON.parse(attributes);
        if (Array.isArray(attrs)) {
          query.$and = attrs.map((attr) => ({
            attributes: { $elemMatch: attr },
          }));
        }
      } catch {}
    }
    const mongooseQuery = Product.find(query)
      .populate("brand", "name slug logo")
      .populate("category", "name nameAr slug")
      .populate("store", "storeName logo");
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Featured Products
export const getFeaturedProducts = controllerWrapper(
  "getFeaturedProducts",
  async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await paginateProducts({
      filter: { featured: true, isActive: true, deleted: false },
      sort: { createdAt: -1 },
      page,
      limit,
    });
    res.status(200).json(result);
  }
);

// Get Products By Category
export const getProductsByCategory = controllerWrapper(
  "getProductsByCategory",
  async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = {
      category: await categoryFilterValue(categoryId),
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query)
      .populate("brand", "name slug logo")
      .populate("category", "name nameAr slug")
      .populate("store", "storeName logo");
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Products By Brand
export const getProductsByBrand = controllerWrapper(
  "getProductsByBrand",
  async (req, res) => {
    const { brandId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = {
      brand: brandId,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query)
      .populate("brand", "name slug logo")
      .populate("category", "name nameAr slug")
      .populate("store", "storeName logo");
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Get Products By Store
export const getStoreProducts = controllerWrapper(
  "getStoreProducts",
  async (req, res) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const query = {
      store: storeId,
      isActive: true,
      deleted: false,
    };
    const mongooseQuery = Product.find(query)
      .populate("brand", "name slug logo")
      .populate("category", "name nameAr slug")
      .populate("store", "storeName logo");
    const result = await paginateQuery(page, limit, mongooseQuery);
    res.status(200).json(result);
  }
);

// Reviews
export const checkReviewEligibility = controllerWrapper(
  "checkReviewEligibility",
  async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const hasPaidOrder = await Order.exists({
      user: userId,
      "orderItems.product": productId,
      cancelled: { $ne: true },
      status: { $ne: "cancelled" },
    });

    return res.status(200).json({
      success: true,
      eligible: Boolean(hasPaidOrder),
    });
  }
);

export const addProductReview = controllerWrapper(
  "addProductReview",
  async (req, res) => {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Ensure the user has paid for this product before leaving a review
    const hasPaidOrder = await Order.exists({
      user: userId,
      "orderItems.product": productId,
      cancelled: { $ne: true },
      status: { $ne: "cancelled" },
    });

    if (!hasPaidOrder) {
      return res.status(403).json({
        success: false,
        message: "You can only review products you have purchased",
      });
    }
    // Prevent duplicate review by same user
    if (product.reviews.some((r) => r.user.toString() === userId.toString())) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }
    product.reviews.push({ user: userId, rating, comment });
    // Update average rating
    // product.rating =
    //   product.reviews.reduce((acc, r) => acc + r.rating, 0) /
    //   product.reviews.length;
    product.calculateRating();
    await product.save();

    // Create notification for store owner about new review
    const store = await mongoose
      .model("Store")
      .findById(product.store)
      .populate("owner");
    if (store && store.owner) {
      const reviewer = await User.findById(userId);
      await Notification.create({
        user: store.owner._id,
        title: "New Product Review",
        message: `Your product "${product.name}" received a new review from ${
          reviewer?.name || "A customer"
        }`,
        type: "review",
      });
    }

    logAudit(req, "review.created", "product", product._id, {
      productName: product.name,
      rating,
    }, { category: "customer" });

    res.status(201).json({ success: true, reviews: product.reviews });
  }
);

export const updateProductReview = controllerWrapper(
  "updateProductReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    const review = product.reviews.id(reviewId);
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    // Update average rating
    // product.rating =
    //   product.reviews.reduce((acc, r) => acc + r.rating, 0) /
    //   product.reviews.length;
    product.calculateRating();
    await product.save();
    res.status(200).json({ success: true, review });
  }
);

export const deleteProductReview = controllerWrapper(
  "deleteProductReview",
  async (req, res) => {
    const { productId, reviewId } = req.params;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    const review = product.reviews.id(reviewId);
    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }
    // review.remove(); // this does not delete the product from the array fix it
    product.reviews = product.reviews.filter(
      (r) => r._id.toString() !== reviewId
    );
    // Update average rating
    // product.rating =
    //   product.reviews.length > 0
    //     ? product.reviews.reduce((acc, r) => acc + r.rating, 0) /
    //       product.reviews.length
    //     : 0;
    product.calculateRating();
    await product.save();
    res.status(200).json({ success: true, message: "Review deleted" });
  }
);

// Features
export const getProductFeatures = controllerWrapper(
  "getProductFeatures",
  async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const product = await Product.findById(productId, "features");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    // Paginate features array manually
    const total = product.features.length;
    const start = (page - 1) * limit;
    const end = start + Number(limit);
    const data = product.features.slice(start, end);
    const pages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data,
      total,
      limit: Number(limit),
      page: Number(page),
      pages,
    });
  }
);

export const addProductFeature = controllerWrapper(
  "addProductFeature",
  async (req, res) => {
    const { productId } = req.params;
    const { feature } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.features.push(feature);
    await product.save();
    res.status(201).json({ success: true, features: product.features });
  }
);

export const updateProductFeature = controllerWrapper(
  "updateProductFeature",
  async (req, res) => {
    const { productId } = req.params;
    const { features } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (!Array.isArray(features) || features.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Features must be an array" });

    product.features = features;
    await product.save();
    res.status(200).json({ success: true, features: product.features });
  }
);

export const deleteProductFeature = controllerWrapper(
  "deleteProductFeature",
  async (req, res) => {
    const { productId, featureId } = req.params;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    if (!product.features[featureId])
      return res
        .status(404)
        .json({ success: false, message: "Feature not found" });
    product.features.splice(featureId, 1);
    await product.save();
    res.status(200).json({ success: true, features: product.features });
  }
);

// Attributes
export const getProductAttributes = controllerWrapper(
  "getProductAttributes",
  async (req, res) => {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const product = await Product.findById(productId, "attributes");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    // Paginate attributes array manually
    const total = product.attributes.length;
    const start = (page - 1) * limit;
    const end = start + Number(limit);
    const data = product.attributes.slice(start, end);
    const pages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data,
      total,
      limit: Number(limit),
      page: Number(page),
      pages,
    });
  }
);

export const addProductAttribute = controllerWrapper(
  "addProductAttribute",
  async (req, res) => {
    const { productId } = req.params;
    const { name, value } = req.body;
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    product.attributes.push({ name, value });
    await product.save();
    res.status(201).json({ success: true, attributes: product.attributes });
  }
);

export const updateProductAttribute = controllerWrapper(
  "updateProductAttribute",
  async (req, res) => {
    const { productId, attributeId } = req.params;
    const { name, value } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find the attribute by its _id (not array index)
    const attribute = product.attributes.id(attributeId);
    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: "Attribute not found",
      });
    }

    // Update only provided fields
    if (name !== undefined) attribute.name = name;
    if (value !== undefined) attribute.value = value;

    await product.save();

    res.status(200).json({
      success: true,
      attributes: product.attributes,
    });
  }
);

export const deleteProductAttribute = controllerWrapper(
  "deleteProductAttribute",
  async (req, res) => {
    const { productId, attributeId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find the index of the attribute by its _id
    const attributeIndex = product.attributes.findIndex(
      (attr) => attr._id.toString() === attributeId
    );

    if (attributeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Attribute not found",
      });
    }

    // Remove the attribute from the array
    product.attributes.splice(attributeIndex, 1);
    await product.save();

    res.status(200).json({
      success: true,
      attributes: product.attributes,
    });
  }
);

// Get Best Sellers Products
export const getBestSellers = controllerWrapper(
  "getBestSellers",
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await paginateProducts({
      filter: { isActive: true, deleted: false },
      sort: { soldCount: -1 },
      page,
      limit,
    });
    res.status(200).json(result);
  }
);

// Get Newest Products
export const getNewestProducts = controllerWrapper(
  "getNewestProducts",
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await paginateProducts({
      filter: { isActive: true, deleted: false },
      sort: { createdAt: -1 },
      page,
      limit,
    });
    res.status(200).json(result);
  }
);
export const getMostRatedProducts = controllerWrapper(
  "getMostRatedProducts",
  async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await paginateProducts({
      filter: { isActive: true, deleted: false },
      sort: { rating: -1 },
      page,
      limit,
    });
    res.status(200).json(result);
  }
);

// Related products ("you may also like"): same category first, then same
// brand, then top up from bestsellers so the rail is always full.
export const getRelatedProducts = controllerWrapper(
  "getRelatedProducts",
  async (req, res) => {
    const { productId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 8, 20);

    const base = await Product.findById(productId).select("category brand");
    if (!base) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const baseFilter = {
      isActive: true,
      deleted: false,
      approvalStatus: "approved",
    };
    const withRelations = (q) =>
      q
        .sort({ soldCount: -1, rating: -1 })
        .populate("brand", "name slug logo")
        .populate("category", "name nameAr slug")
        .lean();

    const collected = [];
    const seen = new Set([String(base._id)]);
    const pushUnique = (docs) => {
      for (const d of docs) {
        if (collected.length >= limit) break;
        if (seen.has(String(d._id))) continue;
        seen.add(String(d._id));
        collected.push(d);
      }
    };

    if (base.category) {
      pushUnique(
        await withRelations(
          Product.find({
            ...baseFilter,
            category: base.category,
            _id: { $nin: [...seen] },
          }).limit(limit)
        )
      );
    }
    if (collected.length < limit && base.brand) {
      pushUnique(
        await withRelations(
          Product.find({
            ...baseFilter,
            brand: base.brand,
            _id: { $nin: [...seen] },
          }).limit(limit - collected.length)
        )
      );
    }
    if (collected.length < limit) {
      pushUnique(
        await withRelations(
          Product.find({
            ...baseFilter,
            _id: { $nin: [...seen] },
          }).limit(limit - collected.length)
        )
      );
    }

    res.status(200).json({ success: true, data: collected });
  }
);

// Frequently bought together: products that co-occur in real orders with this
// one, ranked by co-occurrence count. Pure signal from purchase history.
export const getFrequentlyBoughtTogether = controllerWrapper(
  "getFrequentlyBoughtTogether",
  async (req, res) => {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }
    const pid = new mongoose.Types.ObjectId(productId);
    const limit = Math.min(Number(req.query.limit) || 6, 12);

    const co = await Order.aggregate([
      { $match: { "orderItems.product": pid } },
      { $unwind: "$orderItems" },
      { $match: { "orderItems.product": { $ne: pid } } },
      { $group: { _id: "$orderItems.product", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    const ids = co.map((c) => c._id).filter(Boolean);
    if (ids.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const products = await Product.find({
      _id: { $in: ids },
      isActive: true,
      deleted: false,
    })
      .populate("brand", "name slug logo")
      .populate("category", "name nameAr slug")
      .lean();

    const order = new Map(ids.map((id, i) => [String(id), i]));
    products.sort(
      (a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0)
    );

    res.status(200).json({ success: true, data: products });
  }
);

// Admin pricing intelligence: products that have competitor prices, ranked by
// how far above the cheapest competitor they sit (biggest chance to win sales).
// Market-aware (no cost field exists, so this isn't margin-based).
export const getPricingInsights = controllerWrapper(
  "getPricingInsights",
  async (req, res) => {
    const rows = await Product.aggregate([
      {
        $match: {
          isActive: true,
          deleted: false,
          "competitorPrices.0": { $exists: true },
        },
      },
      {
        $project: {
          name: 1,
          price: 1,
          competitorMin: { $min: "$competitorPrices.price" },
          competitorAvg: { $avg: "$competitorPrices.price" },
          competitorCount: { $size: "$competitorPrices" },
        },
      },
      {
        $addFields: {
          premiumPct: {
            $cond: [
              { $gt: ["$competitorMin", 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$price", "$competitorMin"] },
                      "$competitorMin",
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { premiumPct: -1 } },
      { $limit: 50 },
    ]);

    const insights = rows.map((r) => {
      const premiumPct = Math.round((r.premiumPct || 0) * 10) / 10;
      const position =
        premiumPct > 2 ? "above" : premiumPct < -2 ? "below" : "at";
      // Suggest matching the cheapest competitor when we're priced above market.
      const suggestedPrice =
        position === "above" ? Math.round(r.competitorMin) : r.price;
      return {
        productId: r._id,
        name: r.name,
        price: r.price,
        competitorMin: r.competitorMin,
        competitorAvg: Math.round((r.competitorAvg || 0) * 100) / 100,
        competitorCount: r.competitorCount,
        premiumPct,
        position,
        suggestedPrice,
      };
    });

    res.status(200).json({ success: true, insights });
  }
);

// Batch fetch products by id (used by the "recently viewed" rail) — one
// round-trip instead of N, with the requested order preserved.
export const getProductsByIds = controllerWrapper(
  "getProductsByIds",
  async (req, res) => {
    const raw = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = raw
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .slice(0, 50);
    if (ids.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const products = await Product.find({
      _id: { $in: ids },
      isActive: true,
      deleted: false,
    })
      .populate("brand", "name slug logo")
      .populate("category", "name nameAr slug")
      .lean();

    const order = new Map(ids.map((id, i) => [String(id), i]));
    products.sort(
      (a, b) =>
        (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0)
    );

    res.status(200).json({ success: true, data: products });
  }
);

// cart
export const addProductToCart = controllerWrapper(
  "addProductToCart",
  async (req, res) => {
    const { productId, quantity = 1, installation = false } = req.body;
    const userId = req.user._id;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find user and validate
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if product already in cart
    const existingItemIndex = user.cart.findIndex(
      (item) =>
        (item.type === "product" || !item.type) &&
        item.product.toString() === productId
    );

    // Only honour the flag if this product actually offers fitting, so a
    // hand-made request can't attach a service that was never published.
    const wantsInstallation = !!installation && !!product.installation?.offered;

    if (existingItemIndex > -1) {
      // Update quantity if exists
      user.cart[existingItemIndex].quantity += quantity;
      // Adding it again with fitting ticked upgrades the line; it never
      // silently drops fitting the customer already asked for.
      if (wantsInstallation) user.cart[existingItemIndex].installation = true;
    } else {
      // Add new item if doesn't exist
      user.cart.push({
        type: "product",
        product: productId, // Note: using 'product' not 'productId'
        quantity,
        installation: wantsInstallation,
      });
    }

    await user.save();

    // Populate product details in response if needed
    const populatedUser = await User.findById(userId).populate("cart.product");

    res.status(201).json({
      success: true,
      cart: populatedUser.cart,
    });
  }
);

export const getCart = controllerWrapper("getCart", async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  res.status(200).json({ success: true, cart: user.cart });
});

// Update Cart
export const updateCart = controllerWrapper("updateCart", async (req, res) => {
  const { quantity, installation } = req.body;
  const { productId } = req.params;
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const cartItemIndex = user.cart.findIndex(
    (item) =>
      (item.type === "product" || !item.type) &&
      item.product.toString() === productId
  );
  if (cartItemIndex === -1)
    return res.status(404).json({
      success: false,
      message: "Product not found in cart",
    });

  if (quantity !== undefined) user.cart[cartItemIndex].quantity = quantity;

  // Lets the customer tick fitting on or off from the cart, not only at the
  // moment they add the product. Re-checked against the product because the
  // seller may have withdrawn the service since it was added.
  if (installation !== undefined) {
    const product = await Product.findById(productId).select("installation");
    user.cart[cartItemIndex].installation =
      !!installation && !!product?.installation?.offered;
  }

  await user.save();
  res.status(200).json({ success: true, cart: user.cart });
});

export const removeFromCart = controllerWrapper(
  "removeFromCart",
  async (req, res) => {
    const { productId } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    // Remove from cart logic here
    // Assuming you have a User model with a cart field
    user.cart = user.cart.filter((item) => {
      if (item.type === "collection") return true;
      return item.product.toString() !== productId;
    });
    await user.save();
    res.status(200).json({ success: true, cart: user.cart });
  }
);

// ── Price Suggestion ──
export const suggestPrice = controllerWrapper(
  "suggestPrice",
  async (req, res) => {
    const { productId } = req.params;
    const { suggestedPrice, reason, guestName } = req.body;

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    product.suggestedPrices.push({
      user: req.user?._id || undefined,
      guestName: guestName || undefined,
      suggestedPrice,
      reason,
    });
    await product.save();

    res.status(201).json({ success: true, message: "Price suggestion submitted" });
  }
);

export const getPriceSuggestions = controllerWrapper(
  "getPriceSuggestions",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId, "suggestedPrices name price")
      .populate("suggestedPrices.user", "name email");
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, data: product.suggestedPrices, currentPrice: product.price });
  }
);

export const reviewPriceSuggestion = controllerWrapper(
  "reviewPriceSuggestion",
  async (req, res) => {
    const { productId, suggestionId } = req.params;
    const { status, adminNote } = req.body;

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    const suggestion = product.suggestedPrices.id(suggestionId);
    if (!suggestion)
      return res.status(404).json({ success: false, message: "Suggestion not found" });

    suggestion.status = status;
    suggestion.adminNote = adminNote;

    // If accepted, update product price
    if (status === "accepted") {
      product.price = suggestion.suggestedPrice;
    }

    await product.save();
    res.status(200).json({ success: true, suggestion });
  }
);

// ── Competitor Prices ──
export const addCompetitorPrice = controllerWrapper(
  "addCompetitorPrice",
  async (req, res) => {
    const { productId } = req.params;
    const { competitorName, competitorUrl, price, currency } = req.body;

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    product.competitorPrices.push({
      competitorName,
      competitorUrl,
      price,
      currency: currency || "EGP",
      addedBy: req.user._id,
    });
    await product.save();

    res.status(201).json({ success: true, data: product.competitorPrices });
  }
);

export const getCompetitorPrices = controllerWrapper(
  "getCompetitorPrices",
  async (req, res) => {
    const { productId } = req.params;
    const product = await Product.findById(productId, "competitorPrices name price")
      .populate("competitorPrices.addedBy", "name");
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({
      success: true,
      currentPrice: product.price,
      competitors: product.competitorPrices,
    });
  }
);

export const updateCompetitorPrice = controllerWrapper(
  "updateCompetitorPrice",
  async (req, res) => {
    const { productId, competitorId } = req.params;
    const { competitorName, competitorUrl, price, currency } = req.body;

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    const competitor = product.competitorPrices.id(competitorId);
    if (!competitor)
      return res.status(404).json({ success: false, message: "Competitor entry not found" });

    if (competitorName) competitor.competitorName = competitorName;
    if (competitorUrl !== undefined) competitor.competitorUrl = competitorUrl;
    if (price) competitor.price = price;
    if (currency) competitor.currency = currency;
    competitor.lastChecked = new Date();

    await product.save();
    res.status(200).json({ success: true, data: product.competitorPrices });
  }
);

export const deleteCompetitorPrice = controllerWrapper(
  "deleteCompetitorPrice",
  async (req, res) => {
    const { productId, competitorId } = req.params;

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    product.competitorPrices = product.competitorPrices.filter(
      (c) => c._id.toString() !== competitorId
    );
    await product.save();
    res.status(200).json({ success: true, message: "Competitor price removed" });
  }
);
