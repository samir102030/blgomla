import Store from "../models/store.model.js";
import User from "../models/user.model.js";

/**
 * The shop's own store.
 *
 * An order belongs to exactly one store — `Order.store` is required, and
 * checkout refuses to submit without one. `Product.store` is not required, and
 * nothing filled it in: every path that creates a product set it only when a
 * vendor was the one creating it. So the whole catalogue, all 11,797 products
 * imported by an administrator, came in unowned, and the checkout page could
 * only say "Unable to determine the store for your order".
 *
 * Belgomla sells its own stock. The vendor model is still there for anyone who
 * sells alongside it, but the shop needs to be a store too, and a product
 * created without one belongs to the shop rather than to nobody.
 *
 * Identified as the store owned by a super admin. Falling back to the only
 * store when there is exactly one keeps a fresh deployment working before
 * anybody has been made a super admin; past that, ambiguity is better answered
 * with null than with a guess about whose stock is whose.
 */
const TTL_MS = 60_000;
let cached = { at: 0, id: undefined };

export const forgetHouseStore = () => {
  cached = { at: 0, id: undefined };
};

/** @returns {Promise<import("mongoose").Types.ObjectId|null>} */
export const houseStoreId = async () => {
  const now = Date.now();
  if (cached.id !== undefined && now - cached.at < TTL_MS) return cached.id;

  let id = null;
  const owners = await User.find({ role: "super_admin" }).select("_id").lean();
  if (owners.length) {
    const store = await Store.findOne({
      owner: { $in: owners.map((o) => o._id) },
      deleted: { $ne: true },
    })
      .select("_id")
      .sort({ createdAt: 1 })
      .lean();
    if (store) id = store._id;
  }

  if (!id) {
    const stores = await Store.find({ deleted: { $ne: true } }).select("_id").limit(2).lean();
    if (stores.length === 1) id = stores[0]._id;
  }

  cached = { at: now, id };
  return id;
};

/**
 * Which store a product being created belongs to.
 *
 * An explicit choice wins, then the vendor's own store, then the shop's. The
 * result can still be null — a deployment with several stores and no super
 * admin has no answer — and the caller is left to decide whether that matters.
 */
export const resolveProductStore = async (user, requested) => {
  if (requested) return requested;

  if (user?.role === "store") {
    const own = await Store.findOne({ owner: user._id, deleted: { $ne: true } })
      .select("_id")
      .lean();
    if (own) return own._id;
  }

  return houseStoreId();
};
