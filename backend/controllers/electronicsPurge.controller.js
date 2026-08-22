import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";
import { forgetElectronicsVisibility } from "../utils/electronicsVisibility.js";

/**
 * Empty the electronics branch so a fresh catalogue can be loaded into it.
 *
 * The two bulk uploads next to this one already rebuild the branch correctly —
 * they find the section by `sectionKey`, resolve every name inside it, and mark
 * what they create `audience: "electronics"`. What they cannot do is forget.
 * They match by name and update in place, so a department that no longer exists
 * in the new sheet, or a product that has been dropped from it, simply stays
 * where it is. Reloading a catalogue from scratch needs something to clear the
 * old one first, and that is the only thing this adds.
 *
 * Three things it deliberately does not do:
 *
 * The root category stays. It carries `sectionKey: "electronics"`, which is how
 * the storefront finds the section at all, and its `isActive` is the switch
 * that publishes it. Deleting it would not empty the section — it would remove
 * the section, silently, with the uploads afterwards building eight new roots
 * in the middle of the main menu.
 *
 * Orders are untouched. An order line keeps its own copy of what was bought, so
 * a receipt still reads correctly after the product is gone, and rewriting
 * somebody's order history because the catalogue was re-imported would be the
 * wrong repair for the wrong problem.
 *
 * Bundles are counted but not edited. A bundle that loses a component is a
 * pricing decision, not a cleanup, so the count is reported and left for a
 * person to deal with.
 */

/** The branch: the root's id first, then every category beneath it. */
const branchIds = async (rootId) => {
  const all = await Category.find({}).select("_id parentCategory").lean();
  const childrenOf = new Map();
  for (const c of all) {
    if (!c.parentCategory) continue;
    const parent = String(c.parentCategory._id || c.parentCategory);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push(String(c._id));
  }

  const ids = [];
  const seen = new Set();
  const queue = [String(rootId)];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    queue.push(...(childrenOf.get(id) || []));
  }
  return ids;
};

const asId = (id) => new mongoose.Types.ObjectId(String(id));

export const purgeElectronicsCatalogue = controllerWrapper(
  "purgeElectronicsCatalogue",
  async (req, res) => {
    const dryRun = req.query.dryRun === "true" || req.body?.dryRun === true;

    const root = await Category.findOne({ sectionKey: "electronics" })
      .select("_id name nameAr isActive")
      .lean();
    if (!root) {
      return res.status(409).json({
        success: false,
        message:
          "No category carries sectionKey \"electronics\", so there is no section to empty.",
      });
    }

    const branch = await branchIds(root._id);
    const descendants = branch.filter((id) => id !== String(root._id)).map(asId);

    // Through the driver rather than the model: the schema hides an unpublished
    // section from every find(), and those rows are exactly what has to go.
    const db = mongoose.connection;
    const products = db.collection("products");

    /*
      Both halves of "in this section", not either one.

      A product filed under a branch category is in the section by where it
      sits; a product marked `audience: "electronics"` is in it by what it
      says. Those two sets should be identical and in practice drift — a
      product moved out of the branch keeps its mark, an import that predates
      the mark has the filing without it. Clearing only one leaves the other
      behind for the next person to find.
    */
    const doomed = {
      $or: [{ category: { $in: descendants } }, { audience: "electronics" }],
    };
    const doomedIds = (await products.find(doomed).project({ _id: 1 }).toArray()).map(
      (p) => p._id
    );

    const orders = db.collection("orders");
    const users = db.collection("users");
    const collections = db.collection("collections");

    const report = {
      root: { _id: root._id, name: root.name, nameAr: root.nameAr, isActive: root.isActive },
      categories: descendants.length,
      products: doomedIds.length,
      // Reported so the decision is made with them in view, then left alone.
      ordersReferencing: await orders.countDocuments({
        "orderItems.product": { $in: doomedIds },
      }),
      bundlesReferencing: await collections.countDocuments({
        "items.product": { $in: doomedIds },
      }),
      cartsHolding: await users.countDocuments({ "cart.product": { $in: doomedIds } }),
      wishlistsHolding: await users.countDocuments({ wishlist: { $in: doomedIds } }),
      dryRun,
    };

    if (dryRun) {
      return res.status(200).json({ success: true, ...report, removed: null });
    }

    const removed = {};

    // A cart or wishlist line pointing at a product that no longer exists shows
    // as a blank row the customer cannot clear, so the lines go with it.
    removed.cartLines = (
      await users.updateMany({}, { $pull: { cart: { product: { $in: doomedIds } } } })
    ).modifiedCount;
    removed.wishlistEntries = (
      await users.updateMany({}, { $pull: { wishlist: { $in: doomedIds } } })
    ).modifiedCount;

    for (const [key, name] of [
      ["reviews", "reviews"],
      ["stockAlerts", "stockalerts"],
      ["questions", "productquestions"],
    ]) {
      if (await db.db.listCollections({ name }).hasNext()) {
        removed[key] = (
          await db.collection(name).deleteMany({ product: { $in: doomedIds } })
        ).deletedCount;
      }
    }

    removed.products = (await products.deleteMany({ _id: { $in: doomedIds } })).deletedCount;
    removed.categories = (
      await db.collection("categories").deleteMany({ _id: { $in: descendants } })
    ).deletedCount;

    // The root kept a list of children that no longer exist.
    await Category.updateOne({ _id: root._id }, { $set: { subCategories: [] } });
    // The publish switch is read through a short-lived cache.
    forgetElectronicsVisibility();

    logAudit(
      req,
      "electronics.purge",
      "category",
      root._id,
      { ...report, removed },
      { category: "admin", severity: "critical" }
    );

    res.status(200).json({ success: true, ...report, removed });
  }
);
