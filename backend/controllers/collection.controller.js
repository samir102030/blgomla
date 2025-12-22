import Collection from "../models/collection.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

const getUnitPrice = (product) => {
  return product.saleActive
    ? product.price * (1 - product.salePercentage / 100)
    : product.price;
};

const validateCollectionItems = async (items, storeId) => {
  const products = await Product.find({
    _id: { $in: items.map((item) => item.product) },
  });

  if (products.length !== items.length) {
    throw new Error("One or more products were not found");
  }

  const storeProducts = products.filter(
    (product) => String(product.store) === String(storeId)
  );
  if (storeProducts.length !== products.length) {
    throw new Error("All products must belong to your store");
  }

  return products;
};

export const createCollection = controllerWrapper(
  "createCollection",
  async (req, res) => {
    const { name, description, items, bundlePrice } = req.body;

    if (!Array.isArray(items) || items.length < 2) {
      return res.status(400).json({
        success: false,
        message: "A collection must include at least two products",
      });
    }

    const storeId = req.store?._id;
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store not found for this user",
      });
    }

    const products = await validateCollectionItems(items, storeId);

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
      description,
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
    const storeId = req.store?._id;
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: "Store not found for this user",
      });
    }

    const collections = await Collection.find({ store: storeId }).populate(
      "items.product"
    );
    res.status(200).json({ success: true, collections });
  }
);

export const updateCollection = controllerWrapper(
  "updateCollection",
  async (req, res) => {
    const { name, description, items, bundlePrice, isActive } = req.body;
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res
        .status(404)
        .json({ success: false, message: "Collection not found" });
    }

    const storeId = req.store?._id;
    if (!storeId || String(collection.store) !== String(storeId)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this collection",
      });
    }

    if (Array.isArray(items) && items.length > 0) {
      await validateCollectionItems(items, storeId);
      collection.items = items;
    }

    if (name !== undefined) collection.name = name;
    if (description !== undefined) collection.description = description;
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

    const storeId = req.store?._id;
    if (!storeId || String(collection.store) !== String(storeId)) {
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
