import Product from "../models/product.model.js";
import StudentCategory from '../models/studentCategory.model.js';
import { resolveProductStore } from "../utils/houseStore.js";
import {
  describeUnreadableSheet,
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
    sendWorkbook(res, await generateStudentCategoryTemplate(), "student-departments-template.xlsx");
  } catch (error) {
    fail(res, error, "Failed to generate the template");
  }
};

export const bulkUploadStudentCategories = async (req, res) => {
  try {
    const dryRun = req.query.dryRun === "true" || req.body.dryRun === "true";
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const { rows, columns } = await parseStudentCategoryExcel(req.file.buffer);
    if (!rows.length) {
      return res
        .status(400)
        .json({ success: false, message: "The sheet has no rows in it." });
    }
    // Every row read blank. Almost always the wrong columns rather than an
    // empty file, and "nothing found" leaves somebody staring at a sheet they
    // can see the contents of. Say which columns were there instead.
    if (!rows.some((row) => row.name)) {
      return res.status(400).json({
        success: false,
        message: describeUnreadableSheet(columns, "a department name"),
      });
    }

    const results = { created: [], updated: [], linked: [], failed: [], totalRows: rows.length };

    /*
      Departments live in `StudentCategory` — see the note on the products
      upload below, and the model's own comment.

      This walked the `Category` branch under `sectionKey: "electronics"` and
      created rows there, which the student shelf and the admin department
      screens never read: both go through `studentCatalog.controller.js`,
      which is `StudentCategory` throughout. So a departments sheet appeared
      to upload — rows created, no errors — and the section's own department
      list did not change.

      No branch walk is needed any more. The collection is the section's, so
      every row in it is a department of this section; nothing has to be
      filtered out by ancestry, and a name here cannot collide with the
      storefront's.
    */
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

      // `StudentCategory` calls these `order` and `active`; the storefront's
      // `Category` calls them `sortOrder` and `isActive`. Writing the wrong
      // pair is silent — Mongoose drops unknown paths — so the sheet's two
      // columns would simply have had no effect.
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
            // A row with no parent named is a top-level department of the
            // section. There is no branch root to hang it off — the whole
            // collection is the section.
            parentCategory: null,
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
    sendWorkbook(res, await generateStudentProductTemplate(), "student-products-template.xlsx");
  } catch (error) {
    fail(res, error, "Failed to generate the template");
  }
};

/** The section's products in the template's own shape, ready to edit and reload. */
export const exportStudentProducts = async (req, res) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find({ audience: "electronics", deleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .lean(),
      StudentCategory.find({}).select("_id name").lean(),
    ]);

    const nameById = new Map(categories.map((c) => [String(c._id), c.name]));
    const buffer = await exportStudentProductsToExcel(products, (id) =>
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

    const { rows, columns } = await parseStudentProductExcel(req.file.buffer);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: "The sheet has no rows in it." });
    }
    if (!rows.some((row) => row.name)) {
      return res.status(400).json({
        success: false,
        message: describeUnreadableSheet(columns, "a product name"),
      });
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

    /*
      Departments come from `StudentCategory`, which is where the shelf reads
      them.

      This used to walk the `Category` branch under `sectionKey: "electronics"`
      and write the result to `Product.category`. Two things were wrong with
      that, and the second is the one a person noticed.

      The shelf — `studentCatalog.controller.js`, which serves both the student
      page and the admin department screens — filters on
      `Product.studentCategory`, a ref into a separate `StudentCategory`
      collection. The uploader never touched that field, so every product it
      created kept the schema default of `null`, and `null` never matches the
      shelf's `$in`. **Products uploaded by spreadsheet did not appear on the
      student page at all.** They saved, they carried the right audience, and
      they were invisible to the only page that lists them.

      And `StudentCategory`'s own doc comment says why it is a separate
      collection rather than a branch: a student department living in the
      storefront's category tree would surface in its menu, search, home feed
      and sitemap, each of which would then have to be taught to skip it.
      Creating those rows was doing exactly the thing the model exists to
      prevent.

      Nothing else depended on the branch write. `electronicsPurge` deletes on
      `$or: [{category: {$in: branch}}, {audience: "electronics"}]` and
      `electronicsVisibility` hides on `audience` alone — and the uploader
      already sets `audience: "electronics"` on every row.
    */
    const [everyDepartment, existing] = await Promise.all([
      StudentCategory.find({}).select("_id name").lean(),
      Product.find({ audience: "electronics" }).select("_id name"),
    ]);

    const categoryByName = new Map(everyDepartment.map((c) => [norm(c.name), c._id]));
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
            // No name suffixing any more: `StudentCategory` names only have to
            // be unique within the student shelf, so "Switches" here cannot
            // collide with the storefront's "Switches" the way a shared
            // `Category` name did.
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

          /*
            The columns the shop's own product export carries and this
            section's narrower template does not.

            Each is spread only when the sheet actually had the column, for the
            same reason the department is: this block is applied over an
            existing product on update, so writing a field the sheet never
            mentioned would blank whatever was there.
          */
          ...(row.minOrderQty ? { minOrderQty: row.minOrderQty } : {}),
          ...(row.salePercentage
            ? { salePercentage: row.salePercentage, saleActive: row.saleActive }
            : {}),
          ...(row.features?.length ? { features: row.features } : {}),
          ...(row.attributes?.length ? { attributes: row.attributes } : {}),
          ...(row.bulkPricing?.length ? { bulkPricing: row.bulkPricing } : {}),
          ...(row.installation ? { installation: row.installation } : {}),
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
            audience: "electronics",
            // The section publishes its own products; the approval queue exists
            // to police what outside sellers put on the storefront.
            approvalStatus: "approved",
            createdBy: req.user._id,
            // Published by the shop, so owned by the shop — an order cannot
            // be raised for a product that belongs to no store.
            store: await resolveProductStore(req.user),
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
