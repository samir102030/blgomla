import express from "express";
import productsRoutes from "./product.route.js";
import usersRoutes from "./auth.route.js";
import brandsRoutes from "./brand.route.js";
import categoriesRoutes from "./category.route.js";
import ordersRoutes from "./order.route.js";
import addressesRoutes from "./address.route.js";
import uploadRoutes from "./upload.js";
import storeRoutes from "./store.route.js";
import analyticsRoutes from "./analytics.route.js";
import reviewRoutes from "./review.route.js";
import chatRoutes from "./chat.route.js";
import notificationRoutes from "./notification.route.js";

const router = express.Router();

router.use("/products", productsRoutes);
router.use("/users", usersRoutes);
router.use("/brands", brandsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/addresses", addressesRoutes);
router.use("/orders", ordersRoutes);
router.use("/upload", uploadRoutes);
router.use("/stores", storeRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/reviews", reviewRoutes);
router.use("/chat", chatRoutes);
router.use("/notifications", notificationRoutes);

export default router;
