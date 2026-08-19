import StudentCategory from "../models/studentCategory.model.js";

/**
 * Walking the student section's departments.
 *
 * The same reasoning as `categoryTree.js`, over the other collection: products
 * are filed at the bottom of the tree, so a filter matching one id answers
 * "products whose department is exactly this", which for every parent is
 * nothing at all. The filter has to mean "this department or anything under
 * it", or picking a parent opens an empty shelf.
 */

/** parentId → [childId] over every live department. */
const loadChildIndex = async () => {
  const all = await StudentCategory.find({ deleted: { $ne: true } })
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
 * @returns {Promise<string[]>} the department's own id followed by every
 *   descendant's. `seen` doubles as a cycle guard, so bad data costs a request
 *   some time rather than hanging it.
 */
export const collectStudentCategoryIds = async (categoryId) => {
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

/** Would making `parentId` the parent of `categoryId` close a loop? */
export const wouldCreateStudentCycle = async (categoryId, parentId) => {
  if (!categoryId || !parentId) return false;
  const descendants = await collectStudentCategoryIds(categoryId);
  return descendants.includes(String(parentId));
};

/**
 * The whole tree, nested, ready to render.
 *
 * Built in memory off one query: departments are counted in tens here, so a
 * recursive lookup per level would be several round-trips to save nothing.
 */
export const buildStudentTree = async ({ includeHidden = false } = {}) => {
  const filter = { deleted: { $ne: true } };
  if (!includeHidden) filter.active = true;

  const all = await StudentCategory.find(filter)
    .sort({ order: 1, name: 1 })
    .lean();

  const byId = new Map(all.map((c) => [String(c._id), { ...c, children: [] }]));
  const roots = [];

  for (const node of byId.values()) {
    const parent = node.parentCategory && byId.get(String(node.parentCategory));
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
};
