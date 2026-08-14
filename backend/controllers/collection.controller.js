import mongoose from "mongoose";
import Collection from "../models/collection.model.js";
import Product from "../models/product.model.js";
import Brand from "../models/brand.model.js";
import Store from "../models/store.model.js";
import User from "../models/user.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { collectionItemsTotal } from "../utils/collectionPricing.js";

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
 * Brands are stored as ids, so a typo would otherwise persist as a dangling
 * reference that renders as a blank chip on the quote. Verified here instead.
 */
const validateBrands = async (brands) => {
  if (!Array.isArray(brands)) return [];
  const ids = [...new Set(brands.map(String))].filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );
  if (ids.length === 0) return [];
  const found = await Brand.find({ _id: { $in: ids } }).select("_id");
  if (found.length !== ids.length) {
    throw badRequest("One or more brands were not found");
  }
  return ids;
};

/**
 * Normalises the installation block from a request body.
 *
 * Absent means "leave it alone", so this returns undefined rather than a
 * zeroed object — otherwise editing a name would silently switch installation
 * off for every collection saved by an older client.
 */
const normaliseInstallation = (raw) => {
  if (raw === undefined || raw === null) return undefined;
  const price = Number(raw.price);
  if (raw.offered && (!Number.isFinite(price) || price < 0)) {
    throw badRequest("Installation price must be zero or more");
  }
  return {
    offered: !!raw.offered,
    price: Number.isFinite(price) && price > 0 ? price : 0,
    note: typeof raw.note === "string" ? raw.note.trim() : "",
    noteAr: typeof raw.noteAr === "string" ? raw.noteAr.trim() : "",
  };
};

/**
 * Strips line prices down to what the model accepts: a number, or null to
 * follow the catalogue. An empty string from a cleared input means "follow".
 */
const normaliseItems = (items) =>
  items.map((item) => {
    const raw = item.unitPrice;
    const blank = raw === "" || raw === null || raw === undefined;
    const price = blank ? null : Number(raw);
    if (!blank && (!Number.isFinite(price) || price < 0)) {
      throw badRequest("Item price must be zero or more");
    }
    return {
      product: item.product,
      quantity: item.quantity,
      unitPrice: price,
    };
  });

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
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      items,
      bundlePrice,
      store,
      brands,
      installation,
    } = req.body;

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

    const normalisedItems = normaliseItems(items);
    const brandIds = await validateBrands(brands);
    const originalTotal = collectionItemsTotal(normalisedItems, products);

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
      items: normalisedItems,
      brands: brandIds,
      installation: normaliseInstallation(installation),
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
      .populate("brands", "name nameAr logo")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, collections });
  }
);

export const getCollectionById = controllerWrapper(
  "getCollectionById",
  async (req, res) => {
    const collection = await Collection.findById(req.params.id)
      .populate("items.product")
      .populate("brands", "name nameAr logo");
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
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      items,
      bundlePrice,
      isActive,
      brands,
      installation,
    } = req.body;
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
    let products = null;
    if (Array.isArray(items) && items.length > 0) {
      products = await validateCollectionItems(items, collection.store, {
        ownStore: !canManageAny,
      });
      collection.items = normaliseItems(items);
    }

    if (brands !== undefined) collection.brands = await validateBrands(brands);
    if (name !== undefined) collection.name = name;
    if (nameAr !== undefined) collection.nameAr = nameAr;
    if (description !== undefined) collection.description = description;
    if (descriptionAr !== undefined) collection.descriptionAr = descriptionAr;
    if (bundlePrice !== undefined) collection.bundlePrice = bundlePrice;
    if (isActive !== undefined) collection.isActive = isActive;

    const nextInstallation = normaliseInstallation(installation);
    if (nextInstallation) collection.installation = nextInstallation;

    // Create enforced "bundle price can't exceed the sum of its parts"; update
    // never did, so the rule could be walked around by saving twice. It matters
    // more now that a line price is editable: raising the bundle and dropping a
    // line in one save would otherwise produce a quote whose discount is
    // negative, and order creation rejects those at checkout — far too late for
    // whoever built it to notice.
    if (items !== undefined || bundlePrice !== undefined) {
      if (!products) {
        products = await Product.find({
          _id: { $in: collection.items.map((i) => i.product) },
        });
      }
      const originalTotal = collectionItemsTotal(collection.items, products);
      if (collection.bundlePrice <= 0 || collection.bundlePrice > originalTotal) {
        return res.status(400).json({
          success: false,
          message:
            "Bundle price must be greater than 0 and less than or equal to the original total",
        });
      }
    }

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
    const { collectionId, quantity = 1, installation = false } = req.body;
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

    // Only honour the flag if this collection actually offers fitting —
    // otherwise a hand-made request could attach a service the operator never
    // published, and checkout would price it from a zero.
    const wantsInstallation =
      !!installation && !!collection.installation?.offered;

    if (existingIndex > -1) {
      user.cart[existingIndex].quantity += quantity;
      // Adding the same bundle again with fitting ticked upgrades the line;
      // it never silently removes fitting the customer already chose.
      if (wantsInstallation) user.cart[existingIndex].installation = true;
    } else {
      user.cart.push({
        type: "collection",
        collection: collectionId,
        quantity,
        installation: wantsInstallation,
      });
    }

    await user.save();

    res.status(201).json({ success: true, cart: user.cart });
  }
);

export const updateCollectionCart = controllerWrapper(
  "updateCollectionCart",
  async (req, res) => {
    const { quantity, installation } = req.body;
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
    // Lets the customer tick fitting on or off from the cart, not just at the
    // moment they add the bundle.
    if (installation !== undefined) {
      user.cart[cartIndex].installation =
        !!installation && !!collection.installation?.offered;
    }
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
