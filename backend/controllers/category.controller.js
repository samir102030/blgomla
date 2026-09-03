import Category from "../models/category.model.js";
import { ANY_AUDIENCE, isElectronicsCategory } from "../utils/electronicsVisibility.js";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { clearStorefrontCaches } from "../utils/storefrontCache.js";
import { findByName } from "../utils/findOrCreateByName.js";
import {
  categoryFilterValue,
  collectCategoryIds,
  wouldCreateCycle,
} from "../utils/categoryTree.js";

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
    const all = await Category.find({ deleted: { $ne: true } })
      .populate("parentCategory", "name nameAr slug")
      .populate("subCategories", "name nameAr slug")
      .sort({ sortOrder: 1, name: 1 });

    // A switched-off category takes its whole branch with it.
    //
    // Dropping only the category itself would leave its children in the list,
    // and every flat consumer — the products filter, the coupon form — would
    // still offer them. The menu happens to hide orphans, which is exactly the
    // kind of accident that makes a leak somewhere else hard to believe.
    //
    // `includeHidden` is for the dashboard, which cannot switch a category back
    // on if it can no longer see it.
    const includeHidden = req.query.includeHidden === "true";
    let categories = all;
    if (!includeHidden) {
      const off = new Set(
        all.filter((c) => c.isActive === false).map((c) => String(c._id)),
      );
      const parentOf = new Map(
        all.map((c) => [
          String(c._id),
          c.parentCategory ? String(c.parentCategory._id || c.parentCategory) : null,
        ]),
      );
      const buried = (id) => {
        let cursor = id;
        const seen = new Set();
        while (cursor && !seen.has(cursor)) {
          if (off.has(cursor)) return true;
          seen.add(cursor);
          cursor = parentOf.get(cursor) || null;
        }
        return false;
      };
      categories = all.filter((c) => !buried(String(c._id)));
    }

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

    /*
      An explicit list, rather than `Object.assign(category, req.body)`.

      Two of this document's fields are not opinions the caller is entitled to:
      `subCategories` is the denormalised mirror of everybody else's
      `parentCategory` and is maintained below, and `deleted` has its own pair
      of endpoints with their own refusals — `safeDeleteCategory` counts what
      sits under a category before letting it go. A body that happened to carry
      either would have gone straight in: send back a category object you read
      from `GET /categories/:id` with one child edited out of its
      `subCategories`, and the parent forgets that child while the child still
      names the parent. The tree then reads differently depending on which side
      you walk it from, which is the one failure a restructure cannot afford,
      because it does not surface until something is already missing from the
      shop.

      Nothing legitimate is lost: every field the dashboard actually edits is
      on this list.
    */
    const EDITABLE = [
      "name",
      "nameAr",
      "description",
      "descriptionAr",
      "image",
      "icon",
      "metaTitle",
      "metaDescription",
      "sortOrder",
      "isActive",
      "showInMenu",
      "parentCategory",
    ];
    for (const field of EDITABLE) {
      if (!(field in req.body)) continue;
      /*
        "" and null both mean "no parent" and must both clear it.

        The modal sends null, which is a value and survives JSON; an empty
        string is what a <select> hands over if it ever reaches here directly.
        Casting "" to an ObjectId throws, so it is normalised rather than
        passed on.
      */
      if (field === "parentCategory") {
        category.parentCategory = req.body.parentCategory || null;
        continue;
      }
      category[field] = req.body[field];
    }
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
    const category = await Category.findById(categoryId);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });

    /*
      Refusing beats orphaning.

      This flipped `deleted` with no thought for what sat under it. Delete a
      parent with six subcategories and four hundred products and the parent
      leaves the tree — but the children keep a `parentCategory` id that is no
      longer in any list, so `CategoriesPage` walks down from the roots and
      never reaches them: the whole branch vanishes from the dashboard and can
      only be found through the search box, which flattens.

      On the storefront it is the other way round. `getAllCategories` decides
      what is buried by walking up through parents it can see, and it cannot
      see a deleted one — so the branch stays live and keeps selling, from a
      menu the operator believes they have taken down.

      The student module already refuses exactly this, in
      `deleteStudentCategory`, and says why in the same words. The main
      catalogue simply never learned it.
    */
    const [children, products] = await Promise.all([
      Category.countDocuments({ parentCategory: category._id, deleted: { $ne: true } }),
      Product.countDocuments({ category: category._id, deleted: { $ne: true } }),
    ]);
    if (children) {
      return res.status(409).json({
        success: false,
        code: "CATEGORY_HAS_CHILDREN",
        message: `Move or remove the ${children} categor${children === 1 ? "y" : "ies"} under this one first.`,
      });
    }
    if (products) {
      return res.status(409).json({
        success: false,
        code: "CATEGORY_HAS_PRODUCTS",
        message: `Move the ${products} product${products === 1 ? "" : "s"} in this category first.`,
      });
    }

    category.deleted = true;
    await category.save();
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
    // Somebody asked for this category by name. If it is in the electronics
    // branch, that is one of the two ways the section is meant to be reached,
    // so the listing says so and the gate stands aside.
    const audienceScope = (await isElectronicsCategory(categoryId))
      ? { audience: ANY_AUDIENCE }
      : {};
    const products = await Product.find({
      category: categoryFilter,
      deleted: { $ne: true },
      ...audienceScope,
    })
      .populate("brand", "name slug logo")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments({
      category: categoryFilter,
      deleted: { $ne: true },
      ...audienceScope,
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

/**
 * Move every product filed under one category into another.
 *
 * The dashboard has had the screen for this since before I got here — the
 * modal picks a target, offers to include subcategories, and asks for a count
 * before it writes anything. What it never had was somewhere to send the
 * request: nothing on the server answered `POST
 * /categories/:id/move-products`, so the count read "Could not read the
 * count", the button stayed disabled, and no page imported the component at
 * all. Recategorising a catalogue meant opening products one at a time.
 *
 * `dryRun` is the same call with the write left off, so the number in the
 * confirmation is the number of documents the move will actually touch rather
 * than a separate query that could disagree with it.
 */
export const moveCategoryProducts = controllerWrapper(
  "moveCategoryProducts",
  async (req, res) => {
    const { categoryId } = req.params;
    const {
      targetCategoryId,
      includeSubcategories = true,
      dryRun = false,
    } = req.body;

    if (!targetCategoryId) {
      return res
        .status(400)
        .json({ success: false, message: "Choose a category to move into" });
    }
    if (String(targetCategoryId) === String(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "That is the category the products are already in",
      });
    }

    const [source, target] = await Promise.all([
      Category.findById(categoryId).lean(),
      Category.findById(targetCategoryId).lean(),
    ]);
    if (!source || source.deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    if (!target || target.deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Target category not found" });
    }

    // Which categories the products are coming out of. Without subcategories
    // this is the one; with them it is the whole branch, because a catalogue
    // three levels deep files its products at the leaves and "move Laptops"
    // meaning "move the nothing filed directly on Laptops" would be useless.
    const fromIds = includeSubcategories
      ? await collectCategoryIds(categoryId)
      : [String(categoryId)];

    // Moving a branch into its own descendant. Every product below the target
    // would keep the category it has and everything else would land on top of
    // it, so the result is neither "moved" nor "unchanged" — refusing says so
    // instead of reporting a number that means neither.
    if (fromIds.includes(String(targetCategoryId))) {
      return res.status(400).json({
        success: false,
        message:
          "That category is inside the one you are moving from — pick a target outside it",
      });
    }

    /*
      The electronics branch does not mix with the rest of the catalogue.

      Which section a product belongs to is `audience` on the product, not the
      category it sits in, and this endpoint does not touch `audience`. So a
      move across the boundary files products where nobody will find them:
      electronics products dragged into an ordinary category stay hidden from
      every ordinary listing — the operator moves two hundred products into
      Cables and watches nothing appear — and ordinary products dragged into
      the electronics branch start showing up in a section that is deliberately
      kept apart from the shop.

      Refusing is the honest answer, because the move the operator wants in
      that case is a change of section, which is a different decision made in a
      different place.
    */
    const [sourceInElectronics, targetInElectronics] = await Promise.all([
      isElectronicsCategory(categoryId),
      isElectronicsCategory(targetCategoryId),
    ]);
    if (sourceInElectronics !== targetInElectronics) {
      return res.status(400).json({
        success: false,
        code: "CROSSES_SECTION",
        message:
          "One of these categories is in the electronics section and the other is not. Products cannot be moved across the two.",
      });
    }

    const filter = { category: { $in: fromIds }, deleted: { $ne: true } };
    const count = await Product.countDocuments(filter);

    const targetSummary = {
      _id: target._id,
      name: target.name,
      nameAr: target.nameAr || "",
    };

    if (dryRun) {
      return res
        .status(200)
        .json({ success: true, count, target: targetSummary });
    }

    const result = await Product.updateMany(filter, {
      $set: { category: target._id },
    });

    /*
      Cleared again, after the write.

      The route's `invalidate` middleware runs on the way in, which is the
      pattern every write here follows and is fine when the write is one small
      document. This one can shift thousands of products between departments,
      and any read landing between the clear and the `updateMany` would refill
      the category caches with the counts from before the move and hold them
      for the full five minutes. Clearing once more when the write has actually
      finished costs one map delete and removes the window.
    */
    clearStorefrontCaches("categories");

    res.status(200).json({
      success: true,
      count,
      moved: result.modifiedCount ?? 0,
      target: targetSummary,
    });
  }
);

// Set Category to Product
export const setCategoryToProduct = controllerWrapper(
  "setCategoryToProduct",
  async (req, res) => {
    const { productId } = req.params;
    const { categoryId } = req.body;

    // The id was written straight onto the product without anyone asking
    // whether it named a category. A stale id from a list left open in another
    // tab, or a deleted one, filed the product under a category that no walk
    // over the tree reaches: it stops appearing in its old department and
    // never appears in a new one, and the only sign is a product that has
    // quietly left the shop.
    const category = await Category.findById(categoryId).select("_id deleted").lean();
    if (!category || category.deleted) {
      return res
        .status(400)
        .json({ success: false, message: "Category not found" });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { category: category._id },
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
