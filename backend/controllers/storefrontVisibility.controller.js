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

    res.status(200).json({ success: true, items: rows });
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
