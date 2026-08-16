import Category from "../models/category.model.js";
import { generateCategoryTemplate, parseCategoryExcel } from "../utils/categoryExcel.js";
import { clearStorefrontCaches } from "../utils/storefrontCache.js";

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
 * Depth the storefront navigation can render. A row whose parent chain runs
 * deeper is imported at the depth it can reach and reported, rather than
 * creating a level nothing will ever show.
 */
const MAX_DEPTH = 3;

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
    for (const c of existing.filter((c) => c.deleted)) byName.set(norm(c.name), c);
    for (const c of existing.filter((c) => !c.deleted)) byName.set(norm(c.name), c);
    // Rows keyed by name so pass 2 can find a parent defined in this sheet.
    const inSheet = new Map();

    // ── Pass 1: the categories themselves ──────────────────────────────────
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
      inSheet.set(norm(row.name), row);

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
        const found = byName.get(norm(row.name));
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
          byName.set(norm(row.name), doc);
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
    // Walks up from each row to catch a chain that loops or runs too deep
    // before writing anything — a cycle here would hang every menu render.
    const parentNameOf = (name) => {
      const sheetRow = inSheet.get(norm(name));
      if (sheetRow) return sheetRow.parentName;
      const stored = byName.get(norm(name));
      if (!stored?.parentCategory) return "";
      const parent = [...byName.values()].find(
        (c) => String(c._id) === String(stored.parentCategory)
      );
      return parent?.name ?? "";
    };

    for (const row of rows) {
      if (!row.name || !row.parentName) continue;
      if (results.failed.some((f) => f.row === row.rowNumber)) continue;

      const child = byName.get(norm(row.name));
      const parent = byName.get(norm(row.parentName));

      if (!parent) {
        results.failed.push({
          row: row.rowNumber,
          name: row.name,
          errors: [`Parent "${row.parentName}" is not in this sheet or the catalogue`],
        });
        continue;
      }

      if (norm(row.parentName) === norm(row.name)) {
        results.failed.push({
          row: row.rowNumber,
          name: row.name,
          errors: ["A category cannot be its own parent"],
        });
        continue;
      }

      // Climb the chain: catches both a loop and a fourth level.
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
          broken = `Nesting is ${depth} deep — the menu shows ${MAX_DEPTH} levels`;
          break;
        }
        cursor = parentNameOf(cursor);
      }
      if (broken) {
        results.failed.push({ row: row.rowNumber, name: row.name, errors: [broken] });
        continue;
      }

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
    res.status(200).json({
      success: true,
      dryRun,
      message: dryRun
        ? `Preview: ${results.created.length} new, ${results.updated.length} updated${restoredNote}, ${results.linked.length} nested, ${results.failed.length} with problems.`
        : `Done. ${results.created.length} created, ${results.updated.length} updated${restoredNote}, ${results.linked.length} nested, ${results.failed.length} failed.`,
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
