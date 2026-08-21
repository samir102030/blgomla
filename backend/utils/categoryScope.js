import Category from "../models/category.model.js";

/**
 * Which categories an account may work in, expanded to whole branches.
 *
 * `user.categoryScope` holds what an administrator chose — usually a parent or
 * two. What every check downstream actually needs is the full set of ids
 * underneath those, because products hang off the leaves: somebody put in
 * charge of "Networking" has to be able to price a product filed under
 * "Networking / Switches / PoE", and that product's category is the leaf, not
 * the branch that was named.
 *
 * Returns null for an unscoped account rather than an empty set. The two mean
 * opposite things — "everything" and "nothing" — and a caller that treats a
 * missing scope as an empty one locks every administrator out of the shop.
 */
const TTL_MS = 30_000;
let tree = { at: 0, childrenOf: null };

const loadTree = async () => {
  const now = Date.now();
  if (tree.childrenOf && now - tree.at < TTL_MS) return tree.childrenOf;

  const all = await Category.find({}).select("_id parentCategory").lean();
  const childrenOf = new Map();
  for (const c of all) {
    const key = String(c.parentCategory || "");
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key).push(String(c._id));
  }
  tree = { at: now, childrenOf };
  return childrenOf;
};

export const forgetCategoryTree = () => {
  tree = { at: 0, childrenOf: null };
};

/** @returns {Promise<Set<string>|null>} */
export const scopedCategoryIds = async (user) => {
  const roots = (user?.categoryScope || []).map(String).filter(Boolean);
  if (!roots.length) return null;

  const childrenOf = await loadTree();
  const ids = new Set();
  const pending = [...roots];
  while (pending.length) {
    const id = pending.pop();
    if (ids.has(id)) continue;
    ids.add(id);
    for (const child of childrenOf.get(id) || []) pending.push(child);
  }
  return ids;
};

/** Is this account confined to part of the catalogue? */
export const isScoped = (user) => Boolean(user?.categoryScope?.length);
