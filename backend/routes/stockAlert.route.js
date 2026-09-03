import express from "express";
import { protectRoute, adminRoute, requirePermission } from "../middleware/auth.middleware.js";
import { listStockAlerts } from "../controllers/stockAlert.controller.js";

const router = express.Router();

/*
  Subscribing is public and lives on the product route (POST
  /products/:id/notify). Reading the resulting demand log is admin-only.

  It was `products.view`, which is in STORE_PERMISSIONS — and the handler has
  no store scope, so any vendor could page through every waiting customer's
  email address for every product in the shop, searchable. Those addresses
  belong to the shop's customers, not to its vendors.

  Admin-only rather than scoped, because scoping this aggregate to a vendor's
  own products is a larger change than the leak needs. A vendor who wants
  demand figures for their own lines should get an endpoint that answers only
  that, without the addresses.
*/
router.get("/", protectRoute, adminRoute, requirePermission("products.view"), listStockAlerts);

export default router;
