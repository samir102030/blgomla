/**
 * Build the storefront category tree from scripts/data/category-tree.json.
 *
 *   node scripts/seedCategoryTree.js            # prints the plan, writes nothing
 *   node scripts/seedCategoryTree.js --apply    # applies it
 *
 * Written for a catalogue that already exists. It never deletes and never
 * detaches: a category named in the tree that is already in the database keeps
 * its id, its image and its products, and is simply moved to where the tree
 * says it belongs. Everything else is left alone and listed at the end, so a
 * category the tree does not mention is reported rather than quietly orphaned.
 *
 * Re-runnable. A second run with nothing changed writes nothing.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");

/**
 * Names this catalogue already uses for a category the tree calls something
 * else. Listed here rather than renamed by hand so the existing record — with
 * its products — becomes the tree's node instead of a second one appearing
 * beside it.
 */
const ALIASES = {
  "Sound Systems": ["SOUND SYSTEM"],
  "Surveillance Cameras": ["SURVEILLANCE CAMERA", "CAMERAS SURVEILLANCE"],
  "Network Cables": ["CABLES"],
  "Mobile Phones": ["MOBILE PHONE"],
};

const norm = (s) => String(s || "").trim().toLowerCase();

/** Case- and whitespace-insensitive lookup across the whole catalogue. */
const buildIndex = (categories) => {
  const byName = new Map();
  for (const c of categories) byName.set(norm(c.name), c);
  return byName;
};

const findExisting = (byName, node) => {
  const direct = byName.get(norm(node.name));
  if (direct) return direct;
  for (const alias of ALIASES[node.name] || []) {
    const hit = byName.get(norm(alias));
    if (hit) return hit;
  }
  return null;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing in .env");
    process.exit(1);
  }

  const tree = JSON.parse(
    await readFile(join(HERE, "data", "category-tree.json"), "utf8")
  );

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to MongoDB${APPLY ? "" : "  (dry run)"}\n`);

  const existing = await Category.find({ deleted: { $ne: true } }).lean();
  const byName = buildIndex(existing);
  const touched = new Set();

  const created = [];
  const moved = [];
  const renamed = [];
  const failed = [];

  /**
   * Walk the tree parents-first: a child's parent id has to exist before the
   * child can point at it.
   */
  const visit = async (nodes, parent, depth) => {
    for (const [index, node] of nodes.entries()) {
      const sortOrder = (index + 1) * 10;
      const indent = "  ".repeat(depth);
      const current = findExisting(byName, node);
      let id;

      try {

      if (!current) {
        created.push(node.name);
        console.log(`${indent}+ ${node.name}`);
        if (APPLY) {
          const doc = new Category({
            name: node.name,
            nameAr: node.nameAr || "",
            parentCategory: parent?.id || null,
            sortOrder,
            isActive: true,
            showInMenu: true,
          });
          await doc.save();
          id = doc._id;
        } else {
          // Dry run: a placeholder id keeps the walk going so the whole plan
          // is printed, not just its first level.
          id = new mongoose.Types.ObjectId();
        }
      } else {
        id = current._id;
        touched.add(String(current._id));

        const currentParent = current.parentCategory
          ? String(current.parentCategory)
          : null;
        const wantedParent = parent ? String(parent.id) : null;
        const willMove = currentParent !== wantedParent;

        if (current.name !== node.name) {
          renamed.push(`${current.name} → ${node.name}`);
        }
        if (willMove) {
          moved.push(
            `${current.name} → under ${parent ? parent.name : "(top level)"}`
          );
        }
        console.log(
          `${indent}${willMove ? "↳" : "·"} ${current.name}${
            current.name !== node.name ? ` (kept as "${node.name}")` : ""
          }`
        );

        if (APPLY) {
          const update = { sortOrder, parentCategory: wantedParent };
          // The tree's spelling wins, so an existing "SOUND SYSTEM" ends up
          // reading like the rest of the menu.
          if (current.name !== node.name) update.name = node.name;
          // Arabic is filled in, never overwritten — a name translated by hand
          // in the dashboard is better than anything this file carries.
          if (!current.nameAr?.trim() && node.nameAr) update.nameAr = node.nameAr;

          // Through the document, so the model's hooks recompute slug, level
          // and path for the new position.
          const doc = await Category.findById(current._id);
          Object.assign(doc, update);
          await doc.save();

          if (willMove) {
            if (currentParent) {
              await Category.findByIdAndUpdate(currentParent, {
                $pull: { subCategories: doc._id },
              });
            }
          }
        }
      }

      if (APPLY && parent?.id) {
        await Category.findByIdAndUpdate(parent.id, {
          $addToSet: { subCategories: id },
        });
      }

      } catch (err) {
        // One category that will not save — a name or slug already taken by
        // something outside this tree is the likely cause — should not take
        // the other ninety-four with it. Report it and carry on; the run is
        // re-runnable once the clash is sorted out.
        failed.push(`${node.name}: ${err.message}`);
        console.log(`${indent}! ${node.name} — ${err.message}`);
        continue;
      }

      if (node.children?.length) {
        await visit(node.children, { id, name: node.name }, depth + 1);
      }
    }
  };

  console.log("Tree\n────");
  await visit(tree, null, 0);

  // Anything the tree did not claim. Not touched — only reported, with its
  // product count, because a category holding stock is a decision for whoever
  // knows what the stock is.
  const leftovers = existing.filter((c) => !touched.has(String(c._id)));
  if (leftovers.length) {
    const counts = await Product.aggregate([
      {
        $match: {
          deleted: { $ne: true },
          category: { $in: leftovers.map((c) => c._id) },
        },
      },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countOf = new Map(counts.map((c) => [String(c._id), c.count]));

    console.log("\nNot in the tree — left exactly as they are\n───────────────");
    for (const c of leftovers) {
      const n = countOf.get(String(c._id)) || 0;
      const where = c.parentCategory ? "sub-category" : "top level";
      console.log(`  ? ${c.name}  (${where}, ${n} product${n === 1 ? "" : "s"})`);
    }
    console.log(
      "\n  Give each one a parent in the dashboard, or add it to\n" +
        "  scripts/data/category-tree.json and run this again."
    );
  }

  console.log(
    `\nCreated ${created.length} · moved ${moved.length} · renamed ${renamed.length}` +
      ` · left alone ${leftovers.length}` +
      (failed.length ? ` · FAILED ${failed.length}` : "")
  );
  if (failed.length) {
    console.log("\nCouldn't save\n─────────────");
    failed.forEach((f) => console.log(`  ! ${f}`));
  }
  if (!APPLY) {
    console.log("\nNothing was written. Re-run with --apply to make it so.");
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
