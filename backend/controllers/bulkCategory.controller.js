import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import {
  buildCategoryExport,
  generateCategoryTemplate,
  parseCategoryExcel,
} from "../utils/categoryExcel.js";
import { clearStorefrontCaches } from "../utils/storefrontCache.js";

/**
 * Download the category tree as a sheet.
 *
 * `?includeDeleted=true` adds the soft-deleted rows, flagged in a column of
 * their own — worth having when a category has gone missing from the storefront
 * and the question is whether it was deleted or merely re-parented.
 */
export const exportCategories = async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const filter = includeDeleted ? {} : { deleted: { $ne: true } };

    const categories = await Category.find(filter)
      .select("name nameAr description descriptionAr image sortOrder isActive showInMenu parentCategory deleted")
      .lean();

    // One aggregate rather than a count per category — this list runs to the
    // hundreds and each row needs a number.
    const directCounts = new Map();
    for (const row of await Product.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $group: { _id: "$category", n: { $sum: 1 } } },
    ])) {
      if (row._id) directCounts.set(String(row._id), row.n);
    }

    const buffer = buildCategoryExport(categories, directCounts);
    const stamp = new Date().toISOString().slice(0, 10);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=categories-${stamp}.xlsx`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export categories",
      error: error.message,
    });
  }
};

/** Download the category upload template. */
export const downloadCategoryTemplate = async (req, res) => {
  try {
    const buffer = generateCategoryTemplate();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=category-upload-template.xlsx");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error generating category template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message,
    });
  }
};

const norm = (s) => String(s ?? "").trim().toLowerCase();

/**
 * The slug the model will derive from a name — kept in step with the pre-save
 * hook in category.model.js.
 *
 * Matching on the name alone is not enough: the name is how a sheet refers to a
 * category, but the slug is what the database holds a unique index on, and the
 * two do not map one to one. "Ink / Toner" and "Ink Toner" are different names
 * and the same slug. Looking a row up by name only, that pair reads as two
 * categories, the second gets created, and Mongo rejects it with a raw E11000
 * that names a slug the sheet never mentions.
 */
const slugOf = (name) =>
  String(name ?? "")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * How deep a parent chain may run. The limit exists to stop a runaway chain,
 * not because the tree cannot hold one: getCategoryTree builds parent/child
 * links with no depth cap, and CategoryNav recurses over `children` the same
 * way, so the extra levels are real, browsable and searchable.
 *
 * What they do not get is a column of their own — the menu panel lays out
 * roots beside the children of whichever root is active, and anything below
 * that is reached by drilling in rather than by hovering.
 */
const MAX_DEPTH = 5;

/**
 * Create the rows a bulk upload held back, once a parent has been chosen for
 * each in the UI.
 *
 * The upload returns those rows untouched rather than filing them somewhere
 * wrong, which leaves them nowhere until something writes them — this is that
 * something. Each item carries the fields the sheet supplied plus a
 * parentCategory id ("" means top level), so the spreadsheet does not have to
 * be uploaded a second time.
 */
export const createHeldCategories = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) {
      return res.status(400).json({ success: false, message: "No categories supplied" });
    }

    const results = { created: [], failed: [] };

    for (const item of items) {
      const name = String(item?.name ?? "").trim();
      if (!name) {
        results.failed.push({ name: "", errors: ["Category name is required"] });
        continue;
      }

      try {
        // Same rule as the upload: a name already in use is that category, not
        // a second one. Retired rows are matched too, so a retired name comes
        // back with its products instead of colliding on the unique slug.
        // Matched on slug, which is what the unique index guards — a name that
        // differs only in punctuation resolves to the category already there
        // rather than becoming a second one the index will reject.
        const existing = await Category.findOne({ slug: slugOf(name) });

        let parentId = null;
        if (item.parentCategory) {
          const parent = await Category.findById(item.parentCategory);
          if (!parent) {
            results.failed.push({ name, errors: ["The chosen parent no longer exists"] });
            continue;
          }
          if (existing && String(parent._id) === String(existing._id)) {
            results.failed.push({ name, errors: ["A category cannot be its own parent"] });
            continue;
          }
          if (parent.level + 1 >= MAX_DEPTH) {
            results.failed.push({
              name,
              errors: [`"${parent.name}" is already ${parent.level + 1} levels down — the catalogue allows ${MAX_DEPTH}`],
            });
            continue;
          }
          parentId = parent._id;
        }

        const fields = {
          nameAr: item.nameAr,
          description: item.description,
          descriptionAr: item.descriptionAr,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
          showInMenu: item.showInMenu,
          ...(item.image ? { image: item.image } : {}),
        };

        const doc = existing ?? new Category({ name });
        for (const [key, value] of Object.entries(fields)) {
          if (value !== "" && value !== undefined) doc[key] = value;
        }
        if (existing?.deleted) doc.deleted = false;
        doc.parentCategory = parentId;
        await doc.save();

        results.created.push({ name: doc.name, parent: parentId ? String(parentId) : null });
      } catch (error) {
        results.failed.push({ name, errors: [error.message] });
      }
    }

    if (results.created.length) clearStorefrontCaches("categories");

    res.status(200).json({
      success: true,
      message: `${results.created.length} created, ${results.failed.length} failed.`,
      results,
    });
  } catch (error) {
    console.error("Error creating held categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create categories",
      error: error.message,
    });
  }
};

/**
 * Bulk-create or update categories from an Excel sheet.
 *
 * Two passes, because a row may name a parent that is defined further down the
 * same sheet:
 *   1. every row is created or updated on its own, parents ignored
 *   2. parents are resolved by name and linked
 *
 * A one-pass version could only ever handle sheets sorted parents-first, which
 * is not how anyone writes them.
 *
 * `dryRun` reports exactly what would happen and writes nothing.
 */
export const bulkUploadCategories = async (req, res) => {
  try {
    const dryRun = req.query.dryRun === "true" || req.body.dryRun === "true";

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const rows = parseCategoryExcel(req.file.buffer);
    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "No categories found in the Excel file",
      });
    }

    const results = {
      created: [],
      updated: [],
      restored: [],
      failed: [],
      linked: [],
      // Rows that cannot be placed yet. Nothing is written for these — they come
      // back so a parent can be chosen by hand.
      needsParent: [],
      totalRows: rows.length,
    };

    // Retired categories are included deliberately. The slug index is unique
    // across deleted rows too, so creating a fresh "IP Camera" beside a retired
    // one fails on a duplicate key — and would be wrong even if it worked: the
    // retired record still holds that category's products. Naming it in a sheet
    // brings it back, products and all, instead of stranding them behind a
    // second category with the same name.
    const existing = await Category.find({});
    // Live first, so a name that exists both live and retired resolves to live.
    const byName = new Map();
    const bySlug = new Map();
    for (const c of existing.filter((c) => c.deleted)) {
      byName.set(norm(c.name), c);
      bySlug.set(c.slug || slugOf(c.name), c);
    }
    for (const c of existing.filter((c) => !c.deleted)) {
      byName.set(norm(c.name), c);
      bySlug.set(c.slug || slugOf(c.name), c);
    }

    // The name is how a sheet refers to a category; the slug is what the unique
    // index actually guards. Falling back to the slug means a row whose name
    // differs only in punctuation still lands on the category already there
    // instead of trying to create a second one and failing on the index.
    const findExisting = (name) => byName.get(norm(name)) ?? bySlug.get(slugOf(name));

    // Rows keyed by name so later phases can find a parent defined in this sheet.
    const inSheet = new Map();
    // ...and by slug, to catch two rows that would collide on the unique index.
    const sheetSlugs = new Map();

    // ── Phase 0: decide what may be written ────────────────────────────────
    // Nothing is created before its parent is known.
    //
    // Creation used to come first and parents second, so a row naming a parent
    // that was nowhere to be found still landed in the catalogue — parked at
    // the top level, counted as created and reported as failed in the same
    // response. Deciding first means a row that cannot be placed is left
    // untouched and handed back instead, to be given a parent by hand.
    for (const row of rows) {
      if (!row.name) {
        results.failed.push({
          row: row.rowNumber,
          name: "",
          errors: ["Category name is required"],
        });
        continue;
      }

      // Two rows naming the same category would fight over it; the first wins
      // and the second is reported rather than silently overwriting.
      if (inSheet.has(norm(row.name))) {
        results.failed.push({
          row: row.rowNumber,
          name: row.name,
          errors: [`Duplicate of row ${inSheet.get(norm(row.name)).rowNumber} in this sheet`],
        });
        continue;
      }

      // Two different names can still reduce to one slug, and the slug is what
      // the unique index guards. Caught here, it reads as the duplicate it is;
      // left to the database it surfaces as a raw E11000 quoting a slug the
      // sheet never mentions.
      const twin = sheetSlugs.get(slugOf(row.name));
      if (twin) {
        results.failed.push({
          row: row.rowNumber,
          name: row.name,
          errors: [
            `Would share the address "${slugOf(row.name)}" with "${twin.name}" on row ${twin.rowNumber}`,
          ],
        });
        continue;
      }

      sheetSlugs.set(slugOf(row.name), row);
      inSheet.set(norm(row.name), row);
    }

    const held = new Set();
    const holdBack = (row, reason) => {
      held.add(norm(row.name));
      results.needsParent.push({
        row: row.rowNumber,
        name: row.name,
        parentName: row.parentName,
        reason,
        // Everything the sheet said about this row, so it can be created later
        // with a chosen parent without uploading the file again.
        fields: {
          nameAr: row.nameAr,
          description: row.description,
          descriptionAr: row.descriptionAr,
          image: row.image,
          sortOrder: row.sortOrder,
          isActive: row.isActive,
          showInMenu: row.showInMenu,
        },
      });
    };

    for (const row of inSheet.values()) {
      if (!row.parentName) continue;
      if (norm(row.parentName) === norm(row.name)) {
        results.failed.push({
          row: row.rowNumber,
          name: row.name,
          errors: ["A category cannot be its own parent"],
        });
        continue;
      }
      if (!inSheet.has(norm(row.parentName)) && !findExisting(row.parentName)) {
        holdBack(row, `Parent "${row.parentName}" is not in this sheet or the catalogue`);
      }
    }

    // A child of a held row cannot be written either — the parent it names will
    // not exist. Repeating until the set stops growing holds a whole branch back
    // together, rather than releasing one level per upload.
    for (let growing = true; growing; ) {
      growing = false;
      for (const row of inSheet.values()) {
        if (held.has(norm(row.name)) || !row.parentName) continue;
        if (held.has(norm(row.parentName))) {
          holdBack(row, `Waiting on "${row.parentName}", which needs a parent of its own`);
          growing = true;
        }
      }
    }

    // Walk up each chain looking for a loop or a level past the limit. This
    // used to run after the rows were already saved, which meant a chain one
    // level too deep produced a category sitting at the top of the catalogue
    // instead of where the sheet asked for it. A row that fails here is held
    // back like any other: the parent it wants is real, just too far down, and
    // picking a shallower one is the fix.
    const parentNameOf = (name) => {
      const sheetRow = inSheet.get(norm(name));
      if (sheetRow) return sheetRow.parentName;
      const stored = findExisting(name);
      if (!stored?.parentCategory) return "";
      const parent = [...byName.values()].find(
        (c) => String(c._id) === String(stored.parentCategory)
      );
      return parent?.name ?? "";
    };

    for (const row of inSheet.values()) {
      if (held.has(norm(row.name)) || !row.parentName) continue;
      if (results.failed.some((f) => f.row === row.rowNumber)) continue;

      let depth = 1;
      let cursor = row.parentName;
      const seen = new Set([norm(row.name)]);
      let broken = null;
      while (cursor) {
        if (seen.has(norm(cursor))) {
          broken = `Parent chain loops back to "${cursor}"`;
          break;
        }
        seen.add(norm(cursor));
        depth += 1;
        if (depth > MAX_DEPTH) {
          broken = `Nesting is ${depth} deep — the catalogue allows ${MAX_DEPTH} levels`;
          break;
        }
        cursor = parentNameOf(cursor);
      }
      if (broken) holdBack(row, broken);
    }

    const isBlocked = (row) =>
      held.has(norm(row.name)) || results.failed.some((f) => f.row === row.rowNumber);

    // ── Pass 1: the categories themselves ──────────────────────────────────
    for (const row of inSheet.values()) {
      if (isBlocked(row)) continue;

      const fields = {
        nameAr: row.nameAr,
        description: row.description,
        descriptionAr: row.descriptionAr,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        showInMenu: row.showInMenu,
        ...(row.image ? { image: row.image } : {}),
      };

      try {
        const found = findExisting(row.name);
        if (found) {
          const wasRetired = found.deleted;
          // Only blank cells are ignored — an existing category keeps the image
          // and text it already has unless the sheet supplies new ones.
          for (const [key, value] of Object.entries(fields)) {
            if (value !== "" && value !== undefined) found[key] = value;
          }
          if (wasRetired) {
            found.deleted = false;
            found.isActive = row.isActive;
          }
          if (!dryRun) await found.save();
          (wasRetired ? results.restored : results.updated).push({
            row: row.rowNumber,
            name: found.name,
          });
        } else {
          const doc = new Category({ name: row.name, ...fields, deleted: false });
          if (!dryRun) await doc.save();
          // Both maps, so a later row naming this one finds it either way.
          byName.set(norm(row.name), doc);
          bySlug.set(slugOf(row.name), doc);
          results.created.push({ row: row.rowNumber, name: row.name });
        }
      } catch (error) {
        results.failed.push({
          row: row.rowNumber,
          name: row.name,
          errors: [error.message],
        });
      }
    }

    // ── Pass 2: parents ────────────────────────────────────────────────────
    // Every row that reaches here cleared phase 0, so this only links.
    for (const row of inSheet.values()) {
      if (isBlocked(row) || !row.parentName) continue;

      const child = findExisting(row.name);
      const parent = findExisting(row.parentName);
      if (!child || !parent) continue;

      try {
        if (String(child.parentCategory ?? "") !== String(parent._id)) {
          child.parentCategory = parent._id;
          // save(), not updateOne: the model's hook recomputes slug and path.
          if (!dryRun) await child.save();
          results.linked.push({ row: row.rowNumber, name: row.name, parent: parent.name });
        }
      } catch (error) {
        results.failed.push({
          row: row.rowNumber,
          name: row.name,
          errors: [error.message],
        });
      }
    }

    if (
      !dryRun &&
      (results.created.length ||
        results.updated.length ||
        results.restored.length ||
        results.linked.length)
    ) {
      clearStorefrontCaches("categories");
    }

    const restoredNote = results.restored.length ? `, ${results.restored.length} restored` : "";
    const waitingNote = results.needsParent.length
      ? `, ${results.needsParent.length} waiting for a parent`
      : "";
    res.status(200).json({
      success: true,
      dryRun,
      message: dryRun
        ? `Preview: ${results.created.length} new, ${results.updated.length} updated${restoredNote}, ${results.linked.length} nested${waitingNote}, ${results.failed.length} with problems.`
        : `Done. ${results.created.length} created, ${results.updated.length} updated${restoredNote}, ${results.linked.length} nested${waitingNote}, ${results.failed.length} failed.`,
      results,
    });
  } catch (error) {
    console.error("Error in bulk category upload:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process bulk upload",
      error: error.message,
    });
  }
};
