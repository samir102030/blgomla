import Collection from "../models/collection.model.js";
import Product from "../models/product.model.js";
import Store from "../models/store.model.js";
import User from "../models/user.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

const getUnitPrice = (product) => {
  return product.saleActive
    ? product.price * (1 - product.salePercentage / 100)
    : product.price;
};

// These are caller mistakes, not server faults. Thrown bare, controllerWrapper
// classified them as 500s — which in production replaces the message with
// "Internal Server Error", so the one person who could fix the request was the
// one person not told what was wrong. Tagging `status` makes them 400s that
// keep their text.
const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const validateCollectionItems = async (items, storeId, { ownStore = true } = {}) => {
  const products = await Product.find({
    _id: { $in: items.map((item) => item.product) },
  });

  if (products.length !== items.length) {
    throw badRequest("One or more products were not found");
  }

  const storeProducts = products.filter(
    (product) => String(product.store) === String(storeId)
  );
  if (storeProducts.length !== products.length) {
    throw badRequest(
      ownStore
        ? "All products must belong to your store"
        : "All products must belong to the selected store"
    );
  }

  return products;
};

/**
 * Who is acting, and on whose behalf.
 *
 * A collection is always owned by a store — `store` is required on the model,
 * and a bundle's products must all come from that one store. Vendors are
 * therefore pinned to their own store. Anyone else who reaches these handlers
 * has passed a `collections.manage` check, so they act as an operator: they
 * may touch any store's collections, and they must name the store explicitly
 * when creating one, since they have none of their own.
 *
 * This is what previously made the admin collections page unusable. The
 * handlers read `req.store` and nothing else, so an admin — who never has one
 * — was rejected before any of the real work started.
 */
const resolveActor = (req, explicitStoreId) => {
  const ownStore = req.store?._id;
  if (ownStore) {
    return { storeId: ownStore, isVendor: true, canManageAny: false };
  }
  return {
    storeId: explicitStoreId || null,
    isVendor: false,
    canManageAny: true,
  };
};

export const createCollection = controllerWrapper(
  "createCollection",
  async (req, res) => {
    const { name, nameAr, description, descriptionAr, items, bundlePrice, store } =
      req.body;

    if (!Array.isArray(items) || items.length < 2) {
      return res.status(400).json({
        success: false,
        message: "A collection must include at least two products",
      });
    }

    const { storeId, isVendor } = resolveActor(req, store);
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Choose which store this collection belongs to",
      });
    }

    // An operator naming someone else's store must name a real one.
    if (!isVendor) {
      const target = await Store.findById(storeId).select("_id deleted");
      if (!target || target.deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Store not found" });
      }
    }

    const products = await validateCollectionItems(items, storeId, {
      ownStore: isVendor,
    });

    const originalTotal = items.reduce((total, item) => {
      const product = products.find(
        (p) => String(p._id) === String(item.product)
      );
      return total + getUnitPrice(product) * item.quantity;
    }, 0);

    if (bundlePrice <= 0 || bundlePrice > originalTotal) {
      return res.status(400).json({
        success: false,
        message:
          "Bundle price must be greater than 0 and less than or equal to the original total",
      });
    }

    const collection = await Collection.create({
      name,
      nameAr,
      description,
      descriptionAr,
      items,
      bundlePrice,
      store: storeId,
    });

    res.status(201).json({ success: true, collection });
  }
);

export const getCollections = controllerWrapper(
  "getCollections",
  async (req, res) => {
    const { storeId, activeOnly } = req.query;
    const query = {};
    if (storeId) query.store = storeId;
    if (activeOnly !== "false") query.isActive = true;

    const collections = await Collection.find(query)
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, collections });
  }
);

export const getCollectionById = controllerWrapper(
  "getCollectionById",
  async (req, res) => {
    const collection = await Collection.findById(req.params.id).populate(
      "items.product"
    );
    if (!collection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }
    res.status(200).json({ success: true, collection });
  }
);

export const getMyCollections = controllerWrapper(
  "getMyCollections",
  async (req, res) => {
    // "Mine" means this vendor's collections. An operator has no store of
    // their own, so for them the honest answer is the whole catalogue —
    // which is what the admin collections page needs to render.
    const { storeId, isVendor } = resolveActor(req, null);
    const query = isVendor ? { store: storeId } : {};

    const collections = await Collection.find(query)
      .populate("items.product")
      .populate("store", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, collections });
  }
);

export const updateCollection = controllerWrapper(
  "updateCollection",
  async (req, res) => {
    const { name, nameAr, description, descriptionAr, items, bundlePrice, isActive } = req.body;
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }

    const { storeId, isVendor, canManageAny } = resolveActor(req, collection.store);
    if (isVendor && String(collection.store) !== String(storeId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this collection",
      });
    }

    // Items always have to come from the store that owns the collection —
    // an operator editing on a vendor's behalf doesn't get to mix in another
    // store's products.
    if (Array.isArray(items) && items.length > 0) {
      await validateCollectionItems(items, collection.store, {
        ownStore: !canManageAny,
      });
      collection.items = items;
    }

    if (name !== undefined) collection.name = name;
    if (nameAr !== undefined) collection.nameAr = nameAr;
    if (description !== undefined) collection.description = description;
    if (descriptionAr !== undefined) collection.descriptionAr = descriptionAr;
    if (bundlePrice !== undefined) collection.bundlePrice = bundlePrice;
    if (isActive !== undefined) collection.isActive = isActive;

    await collection.save();

    res.status(200).json({ success: true, collection });
  }
);

export const deleteCollection = controllerWrapper(
  "deleteCollection",
  async (req, res) => {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }

    const { storeId, isVendor } = resolveActor(req, collection.store);
    if (isVendor && String(collection.store) !== String(storeId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this collection",
      });
    }

    await Collection.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Collection deleted" });
  }
);

export const addCollectionToCart = controllerWrapper(
  "addCollectionToCart",
  async (req, res) => {
    const { collectionId, quantity = 1 } = req.body;
    const userId = req.user._id;

    const collection = await Collection.findById(collectionId).populate(
      "items.product"
    );
    if (!collection || !collection.isActive) {
      return res.status(404).json({
        success: false,
        message: "Collection not found or inactive",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate stock for each product in the collection
    for (const item of collection.items) {
      const product = item.product;
      const requiredQty = item.quantity * quantity;
      if (product.stock < requiredQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Required: ${requiredQty}, Available: ${product.stock}`,
        });
      }
    }

    const existingIndex = user.cart.findIndex(
      (item) =>
        item.type === "collection" &&
        item.collection?.toString() === collectionId
    );

    if (existingIndex > -1) {
      user.cart[existingIndex].quantity += quantity;
    } else {
      user.cart.push({
        type: "collection",
        collection: collectionId,
        quantity,
      });
    }

    await user.save();

    res.status(201).json({ success: true, cart: user.cart });
  }
);

export const updateCollectionCart = controllerWrapper(
  "updateCollectionCart",
  async (req, res) => {
    const { quantity } = req.body;
    const { collectionId } = req.params;
    const userId = req.user._id;

    const collection = await Collection.findById(collectionId).populate(
      "items.product"
    );
    if (!collection || !collection.isActive) {
      return res.status(404).json({
        success: false,
        message: "Collection not found or inactive",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const cartIndex = user.cart.findIndex(
      (item) =>
        item.type === "collection" &&
        item.collection?.toString() === collectionId
    );

    if (cartIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Collection not found in cart",
      });
    }

    for (const item of collection.items) {
      const product = item.product;
      const requiredQty = item.quantity * quantity;
      if (product.stock < requiredQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Required: ${requiredQty}, Available: ${product.stock}`,
        });
      }
    }

    user.cart[cartIndex].quantity = quantity;
    await user.save();

    res.status(200).json({ success: true, cart: user.cart });
  }
);

export const removeCollectionFromCart = controllerWrapper(
  "removeCollectionFromCart",
  async (req, res) => {
    const { collectionId } = req.params;
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.cart = user.cart.filter(
      (item) =>
        !(item.type === "collection" &&
          item.collection?.toString() === collectionId)
    );

    await user.save();
    res.status(200).json({ success: true, cart: user.cart });
  }
);
