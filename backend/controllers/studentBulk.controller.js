import Product from "../models/product.model.js";
import StudentCategory from "../models/studentCategory.model.js";
import {
  exportStudentProductsToExcel,
  generateStudentCategoryTemplate,
  generateStudentProductTemplate,
  parseStudentCategoryExcel,
  parseStudentProductExcel,
} from "../utils/studentCatalogExcel.js";

/**
 * Bulk loading for the student section's catalogue.
 *
 * The same two-pass shape as the shop's category import, for the same reason:
 * a row may name a parent defined further down the sheet, so every row is
 * created first and parents are linked afterwards. A one-pass version only
 * handles sheets sorted parents-first, which is not how anyone writes one.
 *
 * Every endpoint here takes `dryRun`, and a dry run writes nothing. Loading a
 * hundred rows into a live shop without being able to see what they will do
 * first is how a catalogue gets a hundred duplicates in it.
 */

const norm = (value) => String(value ?? "").trim().toLowerCase();

/** How deep the section's own navigation reads. */
const MAX_DEPTH = 3;

const sendWorkbook = (res, buffer, filename) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
};

const fail = (res, error, message) => {
  console.error(`[studentBulk] ${message}:`, error);
  res.status(500).json({ success: false, message, error: error.message });
};

/* ────────────────────────── departments ────────────────────────── */

export const downloadStudentCategoryTemplate = async (req, res) => {
  try {
    sendWorkbook(res, generateStudentCategoryTemplate(), "student-departments-template.xlsx");
  } catch (error) {
    fail(res, error, "Failed to generate the template");
  }
};

export const bulkUploadStudentCategories = async (req, res) => {
  try {
    const dryRun = req.query.dryRun === "true" || req.body.dryRun === "true";
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const rows = parseStudentCategoryExcel(req.file.buffer);
    if (!rows.length) {
      return res
        .status(400)
        .json({ success: false, message: "No departments found in the Excel file" });
    }

    const results = { created: [], updated: [], linked: [], failed: [], totalRows: rows.length };

    // Retired departments are included: naming one in a sheet brings it back
    // with the products it still holds, rather than creating a second
    // department with the same name beside it.
    const existing = await StudentCategory.find({});
    const byName = new Map();
    for (const c of existing.filter((c) => c.deleted)) byName.set(norm(c.name), c);
    for (const c of existing.filter((c) => !c.deleted)) byName.set(norm(c.name), c);

    const inSheet = new Map();

    /* ── Pass 1: the departments themselves ── */
    for (const row of rows) {
      if (!row.name) {
        results.failed.push({ row: row.rowNumber, name: "", errors: ["A department needs a name"] });
        continue;
      }

      // Two rows naming the same department would fight over it; the first
      // wins and the second is reported rather than silently overwriting.
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
        order: row.order,
        active: row.active,
        ...(row.image ? { image: row.image } : {}),
      };

      try {
        const found = byName.get(norm(row.name));
        if (found) {
          // Only blank cells are ignored — a department keeps the text and
          // image it already has unless the sheet supplies new ones.
          for (const [key, value] of Object.entries(fields)) {
            if (value !== "" && value !== undefined) found[key] = value;
          }
          found.deleted = false;
          if (!dryRun) await found.save();
          results.updated.push({ row: row.rowNumber, name: found.name });
        } else {
          const doc = new StudentCategory({
            name: row.name,
            ...fields,
            createdBy: req.user._id,
          });
          if (!dryRun) await doc.save();
          byName.set(norm(row.name), doc);
          results.created.push({ row: row.rowNumber, name: row.name });
        }
      } catch (error) {
        results.failed.push({ row: row.rowNumber, name: row.name, errors: [error.message] });
      }
    }

    /* ── Pass 2: parents ──
       The chain is walked before anything is written, because a loop here
       would hang every render of the section's menu. */
    const parentNameOf = (name) => {
      const sheetRow = inSheet.get(norm(name));
      if (sheetRow) return sheetRow.parentName;
      const stored = byName.get(norm(name));
      if (!stored?.parentCategory) return "";
      const parent = [...byName.values()].find(
        (c) => String(c._id) === String(stored.parentCategory),
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
          errors: [`Parent "${row.parentName}" is not in this sheet or the section`],
        });
        continue;
      }
      if (norm(row.parentName) === norm(row.name)) {
        results.failed.push({
          row: row.rowNumber,
          name: row.name,
          errors: ["A department cannot be its own parent"],
        });
        continue;
      }

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
          broken = `Nesting is ${depth} deep — the section shows ${MAX_DEPTH} levels`;
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
          // save(), not updateOne: the model's hook recomputes slug and level.
          if (!dryRun) await child.save();
          results.linked.push({ row: row.rowNumber, name: row.name, parent: parent.name });
        }
      } catch (error) {
        results.failed.push({ row: row.rowNumber, name: row.name, errors: [error.message] });
      }
    }

    res.status(200).json({
      success: true,
      dryRun,
      message: dryRun
        ? `Preview: ${results.created.length} new, ${results.updated.length} updated, ${results.linked.length} nested, ${results.failed.length} with problems.`
        : `Done. ${results.created.length} created, ${results.updated.length} updated, ${results.linked.length} nested, ${results.failed.length} failed.`,
      results,
    });
  } catch (error) {
    fail(res, error, "Failed to process the upload");
  }
};

/* ─────────────────────────── products ─────────────────────────── */

export const downloadStudentProductTemplate = async (req, res) => {
  try {
    sendWorkbook(res, generateStudentProductTemplate(), "student-products-template.xlsx");
  } catch (error) {
    fail(res, error, "Failed to generate the template");
  }
};

/** The section's products in the template's own shape, ready to edit and reload. */
export const exportStudentProducts = async (req, res) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find({ audience: "students", deleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .lean(),
      StudentCategory.find({}).select("_id name").lean(),
    ]);

    const nameById = new Map(categories.map((c) => [String(c._id), c.name]));
    const buffer = exportStudentProductsToExcel(products, (id) =>
      id ? nameById.get(String(id)) : "",
    );
    sendWorkbook(res, buffer, "student-products.xlsx");
  } catch (error) {
    fail(res, error, "Failed to export the products");
  }
};

export const bulkUploadStudentProducts = async (req, res) => {
  try {
    const dryRun = req.query.dryRun === "true" || req.body.dryRun === "true";
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const rows = parseStudentProductExcel(req.file.buffer);
    if (!rows.length) {
      return res
        .status(400)
        .json({ success: false, message: "No products found in the Excel file" });
    }

    const results = {
      created: [],
      updated: [],
      // Rows that went in without a price. Successes, listed apart so they are
      // easy to find and price afterwards rather than sitting at 0 unnoticed.
      needsPrice: [],
      failed: [],
      createdDepartments: [],
      totalRows: rows.length,
    };

    const [categories, existing] = await Promise.all([
      StudentCategory.find({ deleted: { $ne: true } }).lean(),
      Product.find({ audience: "students" }).select("_id name"),
    ]);

    const categoryByName = new Map(categories.map((c) => [norm(c.name), c._id]));
    const productByName = new Map(existing.map((p) => [norm(p.name), p]));
    const inSheet = new Set();

    for (const row of rows) {
      if (!row.name) {
        results.failed.push({ row: row.rowNumber, name: "", errors: ["A product needs a name"] });
        continue;
      }
      if (inSheet.has(norm(row.name))) {
        results.failed.push({
          row: row.rowNumber,
          name: row.name,
          errors: ["Named twice in this sheet"],
        });
        continue;
      }
      inSheet.add(norm(row.name));

      try {
        // A department named in the sheet is created when it is new — the same
        // thing adding one by hand does. Without this, a sheet that introduces
        // a department cannot be uploaded until somebody creates it first.
        let categoryId = null;
        if (row.departmentName) {
          categoryId = categoryByName.get(norm(row.departmentName)) ?? null;
          if (!categoryId && !dryRun) {
            const made = await StudentCategory.create({
              name: row.departmentName,
              createdBy: req.user._id,
            });
            categoryId = made._id;
            categoryByName.set(norm(row.departmentName), made._id);
            results.createdDepartments.push(made.name);
          } else if (!categoryId && dryRun) {
            results.createdDepartments.push(row.departmentName);
          }
        }

        const unpriced = row.price === null || row.price <= 0;
        const fields = {
          nameAr: row.nameAr,
          description: row.description,
          descriptionAr: row.descriptionAr,
          price: unpriced ? 0 : row.price,
          stock: row.stock,
          tags: row.tags,
          featured: row.featured,
          // An unpriced row is never put in front of a student at zero.
          isActive: unpriced ? false : row.active,
          // Only when the sheet actually named one. A blank Department column
          // means "leave it where it is", not "unfile it" — and the update
          // below writes whatever it is given, so passing null here would move
          // every product in a partial sheet out of its department without
          // saying so.
          ...(row.departmentName ? { studentCategory: categoryId } : {}),
          ...(row.sku ? { sku: row.sku } : {}),
          ...(row.images.length ? { images: row.images } : {}),
        };

        const found = productByName.get(norm(row.name));
        if (found) {
          for (const [key, value] of Object.entries(fields)) {
            if (value !== "" && value !== undefined) found[key] = value;
          }
          found.deleted = false;
          if (!dryRun) await found.save();
          results.updated.push({ row: row.rowNumber, name: found.name });
        } else {
          const doc = new Product({
            name: row.name,
            ...fields,
            audience: "students",
            // The section publishes its own products; the approval queue exists
            // to police what outside sellers put on the storefront.
            approvalStatus: "approved",
            createdBy: req.user._id,
          });
          if (!dryRun) await doc.save();
          productByName.set(norm(row.name), doc);
          results.created.push({ row: row.rowNumber, name: row.name });
        }

        if (unpriced) results.needsPrice.push({ row: row.rowNumber, name: row.name });
      } catch (error) {
        results.failed.push({ row: row.rowNumber, name: row.name, errors: [error.message] });
      }
    }

    const priceNote = results.needsPrice.length
      ? `, ${results.needsPrice.length} still need a price`
      : "";
    res.status(200).json({
      success: true,
      dryRun,
      message: dryRun
        ? `Preview: ${results.created.length} new, ${results.updated.length} updated, ${results.failed.length} with problems${priceNote}.`
        : `Done. ${results.created.length} created, ${results.updated.length} updated, ${results.failed.length} failed${priceNote}.`,
      results,
    });
  } catch (error) {
    fail(res, error, "Failed to process the upload");
  }
};
