import Category from "../models/category.model.js";

/**
 * Walk a category and everything filed beneath it.
 *
 * A catalogue three levels deep files its products at the bottom: a laptop
 * lives under Laptop → Gaming Laptops, never under Laptop itself. Matching a
 * filter against one id therefore answers "products whose category is exactly
 * this", which for every parent in the tree is nothing at all — the menu
 * offers a branch and the page that opens is empty. The filter has to mean
 * "this category or anything under it".
 *
 * The whole shape is read in one lean query and walked in memory. Categories
 * are counted in hundreds at most, so this is cheaper than the recursive
 * lookups it replaces, and it works off `parentCategory` rather than the
 * materialized `path`, which is only rewritten when a parent changes.
 */

/** parentId → [childId] over every live category. */
const loadChildIndex = async () => {
  const all = await Category.find({ deleted: { $ne: true } })
    .select("_id parentCategory")
    .lean();

  const childrenOf = new Map();
  for (const c of all) {
    if (!c.parentCategory) continue;
    const parent = String(c.parentCategory);
    const list = childrenOf.get(parent) || [];
    list.push(String(c._id));
    childrenOf.set(parent, list);
  }
  return childrenOf;
};

/**
 * @returns {Promise<string[]>} the category's own id followed by every
 *   descendant's, breadth-first. `seen` also guards the walk against a cycle,
 *   so bad data slows a request down rather than hanging it.
 */
export const collectCategoryIds = async (categoryId) => {
  if (!categoryId) return [];

  const childrenOf = await loadChildIndex();
  const seen = new Set();
  const ids = [];
  const queue = [String(categoryId)];

  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    queue.push(...(childrenOf.get(id) || []));
  }
  return ids;
};

/**
 * The value to assign to a `category` query field.
 *
 * Leaves stay a plain equality match — no `$in` wrapper around a single id, so
 * the existing index is used exactly as before for the common case.
 */
export const categoryFilterValue = async (categoryId) => {
  const ids = await collectCategoryIds(categoryId);
  if (ids.length <= 1) return categoryId;
  return { $in: ids };
};

/**
 * Would making `parentId` the parent of `categoryId` close a loop?
 *
 * True when they are the same category, or when the proposed parent already
 * sits beneath it. Either one detaches the branch from the tree: it becomes
 * unreachable from any root, and every walk over it — menu, filter, breadcrumb
 * — has to be defended against running forever.
 */
export const wouldCreateCycle = async (categoryId, parentId) => {
  if (!categoryId || !parentId) return false;
  const descendants = await collectCategoryIds(categoryId);
  return descendants.includes(String(parentId));
};
