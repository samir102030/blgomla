import { controllerWrapper } from "../utils/wrappers";
import { paginateQuery } from "../utils/pagination.js";
import Store from "../models/store.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";

export const getAllStores = controllerWrapper(
  "getAllStores",
  async (req, res) => {
    const { page, limit } = req.query;
    const query = Store.find();
    const users = await paginateQuery(page, limit, query);
    if (!users.success) return res.status(400).json(users);
    res.status(200).json(users);
  }
);
export const getStoreByUserId = controllerWrapper(
  "getStoreByUserId",
  (req, res) => {
    const { userId } = req.params;
    const store = Store.findOne({ owner: userId });
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.status(200).json(store);
  }
);
export const getStoreById = controllerWrapper(
  "getStoreById",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id).populate("owner");
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.status(200).json(store);
  }
);
export const createStore = controllerWrapper(
  "createStore",
  async (req, res) => {
    const existingStore = await Store.findOne({ owner: req.user._id });
    if (existingStore)
      return res.status(400).json({
        success: false,
        message: "Store already exists for this user",
      });
    // todo specify allowed fields
    const store = new Store({ ...req.body, owner: req.user._id });
    await store.save();
    res.status(201).json({ success: true, store });
  }
);
export const updateStore = controllerWrapper(
  "updateStore",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id);
    if (!store)
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    if (
      store.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    )
      return res.status(403).json({
        success: false,
        message: "Access denied - You are not authorized to update this store",
      });
    store.set(req.body);
    await store.save();
    res.status(200).json({ success: true, store });
  }
);
export const deleteStore = controllerWrapper(
  "deleteStore",
  async (req, res) => {
    const { id } = req.params;
    const store = await Store.findById(id)
      .populate("owner")
      .populate("products");
    if (!store)
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    if (
      store.owner._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    )
      return res.status(403).json({
        success: false,
        message: "Access denied - You are not authorized to delete this store",
      });
    await store.remove();
    res.status(200).json({ success: true, message: "Store deleted" });
  }
);
export const safeDeleteStore = controllerWrapper(
  "safeDeleteStore",
  async (req, res) => {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.deleted = true;
    await store.save();
    res.json({ success: true, message: "Store soft deleted" });
  }
);

export const restoreStore = controllerWrapper(
  "restoreStore",
  async (req, res) => {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.deleted = false;
    await store.save();
    res.json({ success: true, message: "Store restored" });
  }
);

// export const updateStoreSlider = controllerWrapper(
//   "updateStoreSlider",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const { slider } = req.body;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.slider = slider;
//     await store.save();
//     res.json({ success: true, slider: store.slider });
//   }
// );

// export const deleteStoreSlider = controllerWrapper(
//   "deleteStoreSlider",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.slider = [];
//     await store.save();
//     res.json({ success: true, message: "Slider deleted" });
//   }
// );

// export const addSocialLink = controllerWrapper(
//   "addSocialLink",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.socialLinks.push(req.body);
//     await store.save();
//     res.json({ success: true, socialLinks: store.socialLinks });
//   }
// );

// export const updateSocialLink = controllerWrapper(
//   "updateSocialLink",
//   async (req, res) => {
//     const { storeId, linkId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     const link = store.socialLinks.id(linkId);
//     if (!link)
//       return res.status(404).json({ message: "Social link not found" });
//     Object.assign(link, req.body);
//     await store.save();
//     res.json({ success: true, socialLinks: store.socialLinks });
//   }
// );

// export const deleteSocialLink = controllerWrapper(
//   "deleteSocialLink",
//   async (req, res) => {
//     const { storeId, linkId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.socialLinks.id(linkId).remove();
//     await store.save();
//     res.json({ success: true, socialLinks: store.socialLinks });
//   }
// );

export const activateStore = controllerWrapper(
  "activateStore",
  async (req, res) => {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.isActive = true;
    await store.save();
    res.json({ success: true, message: "Store activated" });
  }
);

export const deactivateStore = controllerWrapper(
  "deactivateStore",
  async (req, res) => {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.isActive = false;
    await store.save();
    res.json({ success: true, message: "Store deactivated" });
  }
);

// export const addStoreFeature = controllerWrapper(
//   "addStoreFeature",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.features.push(req.body);
//     await store.save();
//     res.json({ success: true, features: store.features });
//   }
// );

// export const updateStoreFeature = controllerWrapper(
//   "updateStoreFeature",
//   async (req, res) => {
//     const { storeId, featureId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     const feature = store.features.id(featureId);
//     if (!feature) return res.status(404).json({ message: "Feature not found" });
//     Object.assign(feature, req.body);
//     await store.save();
//     res.json({ success: true, features: store.features });
//   }
// );

// export const deleteStoreFeature = controllerWrapper(
//   "deleteStoreFeature",
//   async (req, res) => {
//     const { storeId, featureId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.features.id(featureId).remove();
//     await store.save();
//     res.json({ success: true, features: store.features });
//   }
// );

// export const addAchievement = controllerWrapper(
//   "addAchievement",
//   async (req, res) => {
//     const { storeId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.achievements.push(req.body);
//     await store.save();
//     res.json({ success: true, achievements: store.achievements });
//   }
// );

// export const updateAchievement = controllerWrapper(
//   "updateAchievement",
//   async (req, res) => {
//     const { storeId, achievementId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     const achievement = store.achievements.id(achievementId);
//     if (!achievement)
//       return res.status(404).json({ message: "Achievement not found" });
//     Object.assign(achievement, req.body);
//     await store.save();
//     res.json({ success: true, achievements: store.achievements });
//   }
// );

// export const deleteAchievement = controllerWrapper(
//   "deleteAchievement",
//   async (req, res) => {
//     const { storeId, achievementId } = req.params;
//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: "Store not found" });
//     store.achievements.id(achievementId).remove();
//     await store.save();
//     res.json({ success: true, achievements: store.achievements });
//   }
// );

// todo not implemented yet
export const getStoreDashboard = controllerWrapper(
  "getStoreDashboard",
  async (req, res) => {
    // Example: return basic stats
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    // Add your own dashboard logic here
    res.json({ success: true, dashboard: { store } });
  }
);

// todo not implemented yet
export const getStoreStatistics = controllerWrapper(
  "getStoreStatistics",
  async (req, res) => {
    // Example: return dummy stats
    const { storeId } = req.params;
    let store;
    if (storeId) store = await Store.findById(storeId);
    else store = await Store.findOne({ owner: req.user._id });
    if (!store) return res.status(404).json({ message: "Store not found" });

    const paidOrders = await Order.find({
      store: store._id,
      isPaid: true,
    });
    // for each order in paidOrders sum the totalPrice
    const totalIncome = paidOrders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );
    const allOrders = await Order.find({ store: store._id });
    const totalSales = allOrders.reduce(
      (acc, order) => acc + order.totalPrice,
      0
    );
    const products = await Product.find({ store: store._id });

    res.json({
      success: true,
      statistics: {
        totalSales,
        totalIncome,
        ordersNumber: allOrders.length,
        productsNumber: products.length,
        paidOrders: paidOrders.length,
        unpaidOrders: allOrders.length - paidOrders.length,
      },
    });
  }
);

export const getAllStoreOrders = controllerWrapper(
  "getAllStoreOrders",
  async (req, res) => {
    const { storeId } = req.params;
    if (storeId) {
      const orders = await Order.find({ store: storeId });
      return res.json({ success: true, orders });
    }
    const store = await Store.findOne({ owner: req.user._id });
    if (!store)
      return res.status(404).json({ message: "Store not found for this user" });

    const orders = await Order.find({ store: store._id });
    return res.json({ success: true, orders });
  }
);

// todo not implemented yet
export const getAllStoreComments = controllerWrapper(
  "getAllStoreComments",
  async (req, res) => {
    const { storeId } = req.params;
    // Assuming you have a Comment model and store reference
    const comments = await Comment.find({ store: storeId });
    res.json({ success: true, comments });
  }
);

export const getAllStoreProducts = controllerWrapper(
  "getAllStoreProducts",
  async (req, res) => {
    const { storeId } = req.params;
    if (storeId) {
      const products = await Product.find({ store: storeId });
      return res.json({ success: true, products });
    }
    const store = await Store.findOne({ owner: req.user._id });
    if (!store)
      return res.status(404).json({ message: "Store not found for this user" });
    const products = await Product.find({ store: store._id });
    res.json({ success: true, products });
  }
);

export const getStoreComments = controllerWrapper(
  "getStoreComments",
  async (req, res) => {
    const { storeId } = req.params;
    if (storeId) {
      // get the comments from the store products
      const products = await Product.find({ store: storeId }).select("_id");
      // const productIds = products.map((p) => p._id);
      const comments = products.map((p) => p.reviews);
      // const comments = await Comment.find({ product: { $in: productIds } });
      return res.json({ success: true, comments });
    }
    const store = await Store.findOne({ owner: req.user._id });
    if (!store)
      return res.status(404).json({ message: "Store not found for this user" });
    const products = await Product.find({ store: store._id }).select("_id");
    // const productIds = products.map((p) => p._id);
    const comments = products.map((p) => p.reviews);

    // const comments = await Comment.find({ product: { $in: productIds } });
    return res.json({ success: true, comments });
    // Assuming you have a Comment model and store reference
    // const comments = await Comment.find({ store: storeId });
    // res.json({ success: true, comments });
  }
);
