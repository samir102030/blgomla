import mongoose from "mongoose";

import Product from "../models/product.model.js";
import StudentCategory from "../models/studentCategory.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import {
  buildStudentTree,
  collectStudentCategoryIds,
  wouldCreateStudentCycle,
} from "../utils/studentCategoryTree.js";

/**
 * The student section's catalogue — its own departments, its own products.
 *
 * Two decisions shape everything here.
 *
 * Departments live in their own collection. The storefront's menu, search,
 * home feed and sitemap all read `Category`, and every one of them would have
 * had to learn to skip student departments. Nothing reads `StudentCategory`
 * but this file, so there is nothing to teach and nowhere to leak.
 *
 * Products stay in `Product`, marked `audience: "students"`. A second product
 * collection would have meant the cart, the order, the stock count, the
 * payment and the shipping label each learning about a second kind of line —
 * five migrations to gain nothing a flag does not already give. The flag is
 * enforced by default: a query that says nothing about audience gets the
 * public catalogue, so a listing written next year cannot leak this one.
 */

const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const fail = (res, status, message) => res.status(status).json({ success: false, message });

const STUDENT = { audience: "students" };

/** What a shelf listing needs, and nothing that would bloat the payload. */
const LIST_FIELDS =
  "name nameAr slug price salePercentage saleActive images rating stock soldCount studentCategory isActive featured";

/* ─────────────────────── departments ─────────────────────── */

/** The tree as the storefront sees it: live departments only. */
export const getStudentTree = controllerWrapper("getStudentTree", async (req, res) => {
  const includeHidden = String(req.query.includeHidden || "") === "true";
  const tree = await buildStudentTree({ includeHidden });
  return ok(res, { tree });
});

/** The flat list the dashboard edits, hidden departments included. */
export const listStudentCategories = controllerWrapper(
  "listStudentCategories",
  async (req, res) => {
    const categories = await StudentCategory.find({ deleted: { $ne: true } })
      .sort({ level: 1, order: 1, name: 1 })
      .lean();

    // One count per department, so the dashboard can say what emptying a
    // department would strand before anybody empties it.
    const counts = await Product.aggregate([
      { $match: { audience: "students", deleted: { $ne: true } } },
      { $group: { _id: "$studentCategory", n: { $sum: 1 } } },
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c.n]));

    return ok(res, {
      categories: categories.map((c) => ({ ...c, productCount: byId.get(String(c._id)) || 0 })),
    });
  },
);

export const createStudentCategory = controllerWrapper(
  "createStudentCategory",
  async (req, res) => {
    const { name, nameAr, description, descriptionAr, image, parentCategory, order, active } =
      req.body || {};

    if (!String(name || "").trim()) return fail(res, 400, "A department needs a name.");
    if (parentCategory && !mongoose.isValidObjectId(parentCategory)) {
      return fail(res, 400, "That parent department does not exist.");
    }

    const category = await StudentCategory.create({
      name: String(name).trim(),
      nameAr: nameAr || "",
      description: description || "",
      descriptionAr: descriptionAr || "",
      image: image || "",
      parentCategory: parentCategory || null,
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      active: active !== false,
      createdBy: req.user._id,
    });

    return ok(res, { category, message: "Department added." }, 201);
  },
);

export const updateStudentCategory = controllerWrapper(
  "updateStudentCategory",
  async (req, res) => {
    const category = await StudentCategory.findById(req.params.id);
    if (!category || category.deleted) return fail(res, 404, "Department not found.");

    const { name, nameAr, description, descriptionAr, image, parentCategory, order, active } =
      req.body || {};

    if (parentCategory !== undefined) {
      const next = parentCategory || null;
      if (next && String(next) === String(category._id)) {
        return fail(res, 400, "A department cannot be its own parent.");
      }
      // Moving a department under one of its own children detaches the branch
      // from the tree: nothing reaches it, and every walk over it has to be
      // defended against running forever.
      if (next && (await wouldCreateStudentCycle(category._id, next))) {
        return fail(res, 400, "That move would put the department inside itself.");
      }
      category.parentCategory = next;
    }

    if (name !== undefined) category.name = String(name).trim() || category.name;
    if (nameAr !== undefined) category.nameAr = nameAr;
    if (description !== undefined) category.description = description;
    if (descriptionAr !== undefined) category.descriptionAr = descriptionAr;
    if (image !== undefined) category.image = image;
    if (order !== undefined && Number.isFinite(Number(order))) category.order = Number(order);
    if (typeof active === "boolean") category.active = active;

    await category.save();
    return ok(res, { category, message: "Department updated." });
  },
);

export const deleteStudentCategory = controllerWrapper(
  "deleteStudentCategory",
  async (req, res) => {
    const category = await StudentCategory.findById(req.params.id);
    if (!category || category.deleted) return fail(res, 404, "Department not found.");

    // Refusing beats cascading. A department with products or children under it
    // is a branch somebody built, and removing it silently would strand every
    // product filed there where no page lists it and nobody goes looking.
    const [children, products] = await Promise.all([
      StudentCategory.countDocuments({ parentCategory: category._id, deleted: { $ne: true } }),
      Product.countDocuments({ studentCategory: category._id, audience: "students", deleted: { $ne: true } }),
    ]);

    if (children) return fail(res, 409, "Empty the departments under this one first.");
    if (products) return fail(res, 409, "Move or remove the products in this department first.");

    category.deleted = true;
    await category.save();
    return ok(res, { message: "Department removed." });
  },
);

/* ───────────────────────── products ───────────────────────── */

/**
 * The shelf, as the storefront reads it.
 *
 * Public: what is on the shelf is the reason to join the programme, and
 * hiding it until somebody has proved enrolment asks them to commit to
 * something they cannot see.
 */
export const getStudentShelf = controllerWrapper("getStudentShelf", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24));
  const search = String(req.query.search || "").trim();
  const sort = String(req.query.sort || "");

  const filter = { ...STUDENT, isActive: true, deleted: { $ne: true } };

  if (req.query.category && mongoose.isValidObjectId(req.query.category)) {
    // A department means itself and everything under it — products are filed
    // at the bottom of the tree, so matching one id would open a parent onto
    // an empty shelf.
    const ids = await collectStudentCategoryIds(req.query.category);
    filter.studentCategory = { $in: ids };
  }

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { nameAr: rx }, { tags: { $in: [rx] } }];
  }

  const order =
    sort === "price-asc"
      ? { price: 1 }
      : sort === "price-desc"
        ? { price: -1 }
        : sort === "newest"
          ? { createdAt: -1 }
          : { featured: -1, soldCount: -1, createdAt: -1 };

  const [products, total, tree] = await Promise.all([
    Product.find(filter)
      .select(LIST_FIELDS)
      .sort(order)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
    buildStudentTree(),
  ]);

  return ok(res, {
    products,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    tree,
  });
});

/** The dashboard's list — hidden products included, so they can be found. */
export const listStudentProducts = controllerWrapper("listStudentProducts", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
  const search = String(req.query.search || "").trim();

  const filter = { ...STUDENT, deleted: { $ne: true } };
  if (req.query.category && mongoose.isValidObjectId(req.query.category)) {
    filter.studentCategory = req.query.category;
  }
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { nameAr: rx }, { sku: rx }];
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select(LIST_FIELDS)
      .populate("studentCategory", "name nameAr slug")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return ok(res, { products, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

export const getStudentProduct = controllerWrapper("getStudentProduct", async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, ...STUDENT }).lean();
  if (!product || product.deleted) return fail(res, 404, "Product not found.");
  return ok(res, { product });
});

/** The fields the section owns. Anything else on a Product is not its business. */
const readProductBody = (body = {}) => {
  const out = {};
  const copy = (key, transform = (v) => v) => {
    if (body[key] !== undefined) out[key] = transform(body[key]);
  };

  copy("name", (v) => String(v).trim());
  copy("nameAr");
  copy("description");
  copy("descriptionAr");
  copy("sku", (v) => String(v).trim() || undefined);
  copy("price", Number);
  copy("salePercentage", Number);
  copy("saleActive", Boolean);
  copy("stock", Number);
  copy("minOrderQty", (v) => Math.max(1, Number(v) || 1));
  copy("featured", Boolean);
  copy("isActive", Boolean);
  copy("images", (v) =>
    (Array.isArray(v) ? v : [])
      .map((img) => (typeof img === "string" ? { url: img } : { url: img?.url, alt: img?.alt }))
      .filter((img) => img.url),
  );
  copy("tags", (v) => (Array.isArray(v) ? v.map(String) : []));

  if (body.studentCategory !== undefined) {
    out.studentCategory = mongoose.isValidObjectId(body.studentCategory)
      ? body.studentCategory
      : null;
  }
  return out;
};

export const createStudentProduct = controllerWrapper(
  "createStudentProduct",
  async (req, res) => {
    const patch = readProductBody(req.body);
    if (!patch.name) return fail(res, 400, "A product needs a name.");
    if (!(patch.price > 0)) return fail(res, 400, "A product needs a price above zero.");

    const product = await Product.create({
      ...patch,
      audience: "students",
      // The section's products are its own to publish; they do not queue behind
      // the vendor approval flow, which exists to police what outside sellers
      // put on the storefront.
      approvalStatus: "approved",
      isActive: patch.isActive ?? true,
      createdBy: req.user._id,
    });

    return ok(res, { product, message: "Product added." }, 201);
  },
);

export const updateStudentProduct = controllerWrapper(
  "updateStudentProduct",
  async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, ...STUDENT });
    if (!product || product.deleted) return fail(res, 404, "Product not found.");

    Object.assign(product, readProductBody(req.body));
    await product.save();
    return ok(res, { product, message: "Product updated." });
  },
);

export const deleteStudentProduct = controllerWrapper(
  "deleteStudentProduct",
  async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, ...STUDENT });
    if (!product) return fail(res, 404, "Product not found.");

    // Soft, like every other product here: an order placed last term still
    // refers to this row, and a hard delete would leave that line naming
    // nothing.
    product.deleted = true;
    product.isActive = false;
    await product.save();
    return ok(res, { message: "Product removed." });
  },
);
