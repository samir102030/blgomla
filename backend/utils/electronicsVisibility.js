import Category from "../models/category.model.js";

/**
 * Is the electronics branch live on the storefront yet?
 *
 * The branch is a normal part of the catalogue — its own root category, its
 * own departments under it, its products filed like any others — but it goes
 * up when the shop decides it goes up, not when the migration that created it
 * happens to run. The switch is the root category's own `isActive`, which the
 * Storefront Visibility page already writes, so publishing the section is the
 * same gesture as publishing anything else rather than a private toggle
 * somewhere only this feature knows about.
 *
 * The root is found by `sectionKey`, not by its name. A name is something an
 * operator is entitled to change — to "Electronics & Components", or to Arabic
 * — and the storefront would then quietly stop recognising its own section.
 *
 * Cached, because this is consulted by a schema hook that runs in front of
 * most product queries and an extra round trip on each of those is not worth
 * paying for an answer that changes a few times a year. The window is short,
 * and flipping the switch clears it outright, so the only thing the TTL covers
 * is a change made straight in the database.
 */
const TTL_MS = 30_000;
let cached = { value: null, at: 0 };

export const electronicsIsLive = async () => {
  const now = Date.now();
  if (cached.value !== null && now - cached.at < TTL_MS) return cached.value;

  const root = await Category.findOne({ sectionKey: "electronics" })
    .select("isActive deleted")
    .lean();

  // No root means the section has not been created yet, which reads the same
  // way as "not live" and needs no special case anywhere upstream.
  cached = { value: !!root && root.isActive === true && root.deleted !== true, at: now };
  return cached.value;
};

/** Called when the switch is written, so the change is visible immediately. */
export const forgetElectronicsVisibility = () => {
  cached = { value: null, at: 0 };
  branch = { ids: null, at: 0 };
};

/**
 * The filter clause to add when the section is not live. Kept here so the
 * schema hook and the aggregation helper cannot drift into two different
 * definitions of what "hidden" means.
 */
export const HIDE_ELECTRONICS = { audience: { $ne: "electronics" } };

/**
 * Opts a query out of the hiding above.
 *
 * Both the schema hook and the aggregation helper stand aside as soon as a
 * query says something about `audience`, so a search sets this to say "all of
 * it, on purpose". Browsing does not: the section stays out of the menu, the
 * category pages and the home rails until it is published, but somebody who
 * types a product name finds the product.
 *
 * `null` inside `$in` also matches documents with no `audience` field, which
 * is most of the catalogue.
 */
export const ANY_AUDIENCE = { $in: [null, "public", "electronics"] };

/**
 * Every category in the electronics branch, root included.
 *
 * A listing scoped to one of these is the second of the two ways the section
 * is meant to be reachable — somebody chose it — so those listings drop the
 * hiding. Cached on the same terms as the switch above: the shape of the tree
 * changes when a department is added, not between two page loads.
 */
const BRANCH_TTL_MS = 30_000;
let branch = { ids: null, at: 0 };

export const electronicsCategoryIds = async () => {
  const now = Date.now();
  if (branch.ids && now - branch.at < BRANCH_TTL_MS) return branch.ids;

  const root = await Category.findOne({ sectionKey: "electronics" }).select("_id").lean();
  const ids = new Set();
  if (root) {
    ids.add(String(root._id));
    const all = await Category.find({}).select("_id parentCategory").lean();
    const childrenOf = new Map();
    for (const c of all) {
      const key = String(c.parentCategory || "");
      if (!childrenOf.has(key)) childrenOf.set(key, []);
      childrenOf.get(key).push(String(c._id));
    }
    const pending = [String(root._id)];
    while (pending.length) {
      for (const child of childrenOf.get(pending.pop()) || []) {
        ids.add(child);
        pending.push(child);
      }
    }
  }

  branch = { ids, at: now };
  return ids;
};

export const isElectronicsCategory = async (id) =>
  Boolean(id) && (await electronicsCategoryIds()).has(String(id));
