import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";
import { ANY_AUDIENCE } from "../utils/electronicsVisibility.js";

/**
 * Departments with no picture, and departments with nothing in them.
 *
 * Measured on the live catalogue after the image migration: 311 of 330
 * categories render the grey placeholder. 139 of those point at addresses on
 * free-electronic.com that no longer exist — twelve sampled, twelve gone, so
 * this is not a host being down, it is files deleted at the source and no
 * migration will ever bring them back. The other 172 never had an image.
 *
 * There is no need to go looking outside for replacements. Every product
 * photograph in this shop is now on our own Cloudinary, and a department full
 * of products already owns pictures of exactly the things it sells. So a
 * category that is missing one can borrow from what is inside it.
 *
 * ## Counting what is inside is the part to get right
 *
 * `productCount` on a category counts products filed *directly* under it. A
 * parent whose products all sit in its children reads zero — the Electronics
 * root reads zero with 5,656 products beneath it — so "zero" does not mean
 * "empty", and treating it that way would empty half the catalogue tree.
 *
 * Everything here counts the whole branch: the category, its children, their
 * children. A category is only empty when nothing anywhere under it holds a
 * product.
 */

/** Products filed directly under each category id, electronics included. */
const directCounts = async () => {
  // An aggregation, deliberately: the schema's find hook hides the electronics
  // audience, and a count that skipped 5,656 products would call full
  // departments empty.
  const rows = await Product.aggregate([
    { $match: { deleted: { $ne: true } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
};

/** id -> [child ids], for walking down a branch. */
const childrenOf = (categories) => {
  const kids = new Map();
  for (const c of categories) {
    const parent = c.parentCategory ? String(c.parentCategory) : null;
    if (!parent) continue;
    if (!kids.has(parent)) kids.set(parent, []);
    kids.get(parent).push(String(c._id));
  }
  return kids;
};

/**
 * How many products live anywhere in a branch.
 *
 * Memoised, and it refuses to revisit an id it is already inside, so a
 * category that has somehow been made its own ancestor cannot spin here.
 */
const branchCounter = (direct, kids) => {
  const memo = new Map();
  const count = (id, seen = new Set()) => {
    if (memo.has(id)) return memo.get(id);
    if (seen.has(id)) return 0;
    seen.add(id);
    let total = direct.get(id) || 0;
    for (const child of kids.get(id) || []) total += count(child, seen);
    memo.set(id, total);
    return total;
  };
  return count;
};

const isOurs = (url) => typeof url === "string" && url.includes("res.cloudinary.com");

/**
 * A picture this category could use, taken from the goods inside it.
 *
 * Its own products first, then its children's, so a parent gets something
 * representative rather than whatever happens to sort first globally. Only
 * images already on our Cloudinary are offered — borrowing a dead link to fix
 * a dead link would be no fix at all.
 */
const proposeImage = async (id, kids, depth = 0) => {
  const ids = [id];
  // Two levels is enough to find a picture and shallow enough to stay quick.
  if (depth < 2) for (const child of kids.get(id) || []) ids.push(child);

  const product = await Product.findOne({
    category: { $in: ids.map((x) => new mongoose.Types.ObjectId(x)) },
    audience: ANY_AUDIENCE,
    deleted: { $ne: true },
    isActive: { $ne: false },
    "images.0.url": { $regex: "res\\.cloudinary\\.com" },
  })
    .select("_id name images")
    .lean();

  const url = product?.images?.find((i) => isOurs(i?.url))?.url || null;
  return url ? { url, from: product.name, productId: String(product._id) } : null;
};

/* ── the audit ──────────────────────────────────────────────────────── */

export const getCategoryAudit = controllerWrapper(
  "getCategoryAudit",
  async (req, res) => {
    const categories = await Category.find({ deleted: { $ne: true } })
      .select("_id name nameAr image parentCategory isActive")
      .lean();

    const direct = await directCounts();
    const kids = childrenOf(categories);
    const inBranch = branchCounter(direct, kids);

    const needsImage = [];
    const empty = [];

    for (const category of categories) {
      const id = String(category._id);
      const held = inBranch(id);

      if (held === 0) {
        empty.push({
          _id: id,
          name: category.name,
          nameAr: category.nameAr || "",
          isActive: category.isActive !== false,
          children: (kids.get(id) || []).length,
        });
        continue;
      }
      if (isOurs(category.image)) continue;

      needsImage.push({
        _id: id,
        name: category.name,
        nameAr: category.nameAr || "",
        products: held,
        // Says which of the two problems this is, because they read
        // differently to an operator: a broken link looked fine once.
        reason: category.image ? "the picture it points at is gone" : "no picture set",
      });
    }

    res.status(200).json({
      success: true,
      audit: {
        categories: categories.length,
        needsImage: needsImage.length,
        empty: empty.length,
        needsImageList: needsImage,
        emptyList: empty,
      },
    });
  }
);

/* ── giving them pictures ───────────────────────────────────────────── */

export const fillCategoryImages = controllerWrapper(
  "fillCategoryImages",
  async (req, res) => {
    const categories = await Category.find({ deleted: { $ne: true } })
      .select("_id name image parentCategory")
      .lean();

    const direct = await directCounts();
    const kids = childrenOf(categories);
    const inBranch = branchCounter(direct, kids);

    const filled = [];
    const skipped = [];

    for (const category of categories) {
      const id = String(category._id);
      if (isOurs(category.image)) continue;
      if (inBranch(id) === 0) continue;

      const proposal = await proposeImage(id, kids);
      if (!proposal) {
        skipped.push({ name: category.name, why: "nothing inside it has a picture of ours" });
        continue;
      }

      await Category.updateOne({ _id: category._id }, { $set: { image: proposal.url } });
      filled.push({ name: category.name, from: proposal.from });
    }

    logAudit(req, "category.images_filled", "category", null, {
      filled: filled.length,
      skipped: skipped.length,
    });

    res.status(200).json({
      success: true,
      filled: filled.length,
      skipped: skipped.length,
      filledList: filled.slice(0, 60),
      skippedList: skipped.slice(0, 30),
    });
  }
);

/* ── the empty ones ─────────────────────────────────────────────────── */

/**
 * Take the empty departments off the storefront, without destroying them.
 *
 * `isActive: false` and nothing else. Names like "Smartphones" and "Mini PCs"
 * are not mistakes — they are shelves waiting for stock — so the reversible
 * act is the right one: they leave the menus and the category pages, and the
 * day something is filed under one it comes back with a single switch.
 *
 * It refuses to touch a category that holds anything anywhere beneath it, even
 * if the request names it, because the whole hazard here is a parent that
 * looks empty and is not.
 */
export const hideEmptyCategories = controllerWrapper(
  "hideEmptyCategories",
  async (req, res) => {
    const categories = await Category.find({ deleted: { $ne: true } })
      .select("_id name parentCategory isActive")
      .lean();

    const direct = await directCounts();
    const kids = childrenOf(categories);
    const inBranch = branchCounter(direct, kids);

    // A list may be supplied to hide only some of them; without one, all.
    const only = Array.isArray(req.body?.ids) && req.body.ids.length
      ? new Set(req.body.ids.map(String))
      : null;

    const hidden = [];
    const refused = [];

    for (const category of categories) {
      const id = String(category._id);
      if (only && !only.has(id)) continue;
      if (category.isActive === false) continue;

      const held = inBranch(id);
      if (held > 0) {
        if (only) refused.push({ name: category.name, holds: held });
        continue;
      }

      await Category.updateOne({ _id: category._id }, { $set: { isActive: false } });
      hidden.push(category.name);
    }

    logAudit(req, "category.empty_hidden", "category", null, { hidden: hidden.length });

    res.status(200).json({
      success: true,
      hidden: hidden.length,
      hiddenList: hidden,
      refused,
    });
  }
);
