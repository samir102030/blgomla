import express from "express";
import productsRoutes from "./product.route.js";
import usersRoutes from "./auth.route.js";
import brandsRoutes from "./brand.route.js";
import categoriesRoutes from "./category.route.js";
import ordersRoutes from "./order.route.js";
import addressesRoutes from "./address.route.js";

const router = express.Router();

router.use("/products", productsRoutes);
router.use("/users", usersRoutes);
router.use("/brands", brandsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/addresses", addressesRoutes);
router.use("/orders", ordersRoutes);

export default router;
