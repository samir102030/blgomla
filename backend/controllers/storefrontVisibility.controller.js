import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { clearStorefrontCaches } from "../utils/storefrontCache.js";
import { logAudit } from "../utils/audit.js";

/**
 * Reads and writes for "what the storefront shows, and in what order".
 *
 * Categories and brands answer the same two questions — is it live, and does
 * it get a slot in the chrome — so one pair of handlers serves both rather
 * than two near-identical copies drifting apart.
 */
const MODELS = {
  categories: { model: Category, namespace: "categories", label: "category" },
  brands: { model: Brand, namespace: "brands", label: "brand" },
};

const resolve = (kind) => MODELS[kind] || null;

/**
 * The same rows, but each parent followed by its own children.
 *
 * Sorting by `sortOrder` alone is what the catalogue used to be arranged with,
 * and it holds while every category has a deliberate number. Three hundred and
 * forty-seven do not: an import gives whole branches the same sortOrder, and
 * ties then fall back to the name — so "Amplifiers & Mixers" sorted above
 * "Sound Systems", the department it belongs to, and the screen listed it three
 * rows under Electronics instead. Read down the page and the tree is shredded:
 * children of three different departments interleaved, each labelled with a
 * parent that is nowhere near it.
 *
 * That matters more than it looks. This screen is not a report — it is the one
 * place the storefront's order is decided, and an operator cannot arrange a
 * list in which they cannot find anything.
 *
 * So the flat result is walked into tree order here rather than in the query:
 * Mongo cannot express "depth-first over a parent pointer" in a sort, and the
 * list is small enough that doing it in memory costs nothing. Within each
 * level the order the query gave is kept, so `sortOrder` still decides what
 * comes first among siblings — which is exactly what dragging a row writes.
 *
 * A category whose parent is missing (deleted, or filtered out) is treated as a
 * root rather than dropped, because a row nobody can see is a row nobody can
 * switch back on. `seen` stops a broken parent chain from repeating a subtree
 * forever.
 */
const inTreeOrder = (rows) => {
  const byId = new Map(rows.map((row) => [String(row._id), row]));
  const childrenOf = new Map();
  const roots = [];

  for (const row of rows) {
    const parent = row.parentCategory?._id || row.parentCategory;
    const parentId = parent ? String(parent) : null;
    if (!parentId || !byId.has(parentId)) {
      roots.push(row);
      continue;
    }
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId).push(row);
  }

  const out = [];
  const seen = new Set();
  const walk = (list) => {
    for (const row of list) {
      const id = String(row._id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(row);
      walk(childrenOf.get(id) || []);
    }
  };
  walk(roots);

  // Anything a cycle kept out still has to be reachable.
  for (const row of rows) if (!seen.has(String(row._id))) out.push(row);
  return out;
};

/**
 * Everything an operator can arrange, including the hidden ones — the admin
 * view must show what is switched off, otherwise it can never be switched
 * back on.
 */
export const listForVisibility = controllerWrapper(
  "listForVisibility",
  async (req, res) => {
    const target = resolve(req.params.kind);
    if (!target) {
      return res.status(404).json({ success: false, message: "Unknown list" });
    }

    const select =
      target.namespace === "categories"
        ? "name nameAr image parentCategory sortOrder isActive showInMenu showInBar"
        : "name nameAr logo sortOrder isActive showInMenu";

    const rows = await target.model
      .find({ deleted: { $ne: true } })
      .select(select)
      .populate(
        target.namespace === "categories"
          ? { path: "parentCategory", select: "name nameAr" }
          : ""
      )
      .sort({ sortOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      items: target.namespace === "categories" ? inTreeOrder(rows) : rows,
    });
  }
);

/**
 * Apply an arrangement in one write.
 *
 * Takes the whole ordered list rather than a single row: reordering is a
 * statement about every position at once, and sending them one at a time
 * leaves the list briefly inconsistent if any request fails.
 */
export const updateVisibility = controllerWrapper(
  "updateVisibility",
  async (req, res) => {
    const target = resolve(req.params.kind);
    if (!target) {
      return res.status(404).json({ success: false, message: "Unknown list" });
    }

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Nothing to update" });
    }

    // Gaps of 10 rather than 1, so a later single-row nudge has room to land
    // between two neighbours without renumbering the whole list.
    const ops = items.map((item, index) => {
      const set = { sortOrder: (index + 1) * 10 };
      if (item.isActive !== undefined) set.isActive = !!item.isActive;
      if (item.showInMenu !== undefined) set.showInMenu = !!item.showInMenu;
      // Categories only — a brand has no slot on the department strip, and a
      // brands payload never carries the field.
      if (item.showInBar !== undefined) set.showInBar = !!item.showInBar;
      return {
        updateOne: { filter: { _id: item._id }, update: { $set: set } },
      };
    });

    const result = await target.model.bulkWrite(ops, { ordered: false });

    // Both the list itself and the home feed are cached in memory; without
    // clearing both, the storefront keeps answering with the arrangement from
    // before the save.
    clearStorefrontCaches(target.namespace);

    logAudit(req, `${target.label}.visibility`, target.namespace, null, {
      count: items.length,
    });

    res.status(200).json({
      success: true,
      matched: result.matchedCount ?? result.nMatched ?? items.length,
      modified: result.modifiedCount ?? result.nModified ?? 0,
    });
  }
);
