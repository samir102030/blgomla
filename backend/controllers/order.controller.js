import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Store from "../models/store.model.js";
import mongoose from "mongoose";
import { controllerWrapper } from "../utils/wrappers.js";
import { reachesAllStores } from "../utils/permissions.js";
import Notification from "../models/notification.model.js";
import Coupon from "../models/coupon.model.js";
import Collection from "../models/collection.model.js";
import Address from "../models/address.model.js";
import { getShippingSettings } from "../models/shippingSettings.model.js";
import { resolveShippingFee } from "../utils/shipping.js";
import { getBostaShippingFee, isBostaEnabled } from "../utils/bosta.js";
import {
  getAccurateShippingFee,
  isAccurateEnabled,
  createAccurateShipment,
} from "../utils/accurate.js";
import { emitNotificationCreated } from "../utils/socket.js";
import { logAudit } from "../utils/audit.js";
import {
  collectionItemsTotal,
  installationFee,
  lineUnitPrice,
} from "../utils/collectionPricing.js";
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from "../utils/email.js";
import { sendSMS, orderSmsText } from "../utils/sms.js";
import {
  earnedPointsFor,
  POINT_VALUE_EGP,
  REFERRER_REWARD,
  REFEREE_REWARD,
} from "../utils/loyalty.js";

// Pay the referral bonus once, on the referred user's first delivered order.
// The conditional findOneAndUpdate atomically claims the reward so it can't
// double-pay even under concurrent deliveries.
const processReferralReward = async (userId) => {
  const claimed = await User.findOneAndUpdate(
    { _id: userId, referredBy: { $ne: null }, referralRewarded: { $ne: true } },
    { $set: { referralRewarded: true }, $inc: { loyaltyPoints: REFEREE_REWARD } },
    { new: false }
  );
  if (!claimed || !claimed.referredBy) return;
  await User.updateOne(
    { _id: claimed.referredBy },
    { $inc: { loyaltyPoints: REFERRER_REWARD, referralCount: 1 } }
  );
};

// Award loyalty points once an order is delivered. Idempotent: the conditional
// update guarantees points are granted at most once even under concurrent calls.
const awardPointsForDelivery = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order || order.pointsAwarded) return;
  const pts = earnedPointsFor(order.itemsPrice);
  const claimed = await Order.updateOne(
    { _id: orderId, pointsAwarded: { $ne: true } },
    { $set: { pointsAwarded: true, pointsEarned: pts } }
  );
  if (claimed.modifiedCount !== 1) return; // another call already handled it
  if (pts > 0) {
    await User.updateOne({ _id: order.user }, { $inc: { loyaltyPoints: pts } });
  }
  // First delivery also unlocks any pending referral bonus for this buyer.
  await processReferralReward(order.user);
};

export const createOrder = controllerWrapper(
  "createOrder",
  async (req, res) => {
    const {
      orderItems = [],
      collectionItems = [],
      shippingAddress,
      paymentMethod,
      store,
      couponCode,
      pointsToRedeem = 0,
    } = req.body;

    // Validate required fields
    if (
      (!Array.isArray(orderItems) || orderItems.length === 0) &&
      (!Array.isArray(collectionItems) || collectionItems.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Order items or collection items are required",
      });
    }

    if (orderItems && !Array.isArray(orderItems)) {
      return res.status(400).json({
        success: false,
        message: "Order items must be an array",
      });
    }

    if (collectionItems && !Array.isArray(collectionItems)) {
      return res.status(400).json({
        success: false,
        message: "Collection items must be an array",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    if (!store) {
      return res.status(400).json({
        success: false,
        message: "Store is required",
      });
    }

    // Validate payment method
    const validPaymentMethods = ["cod", "stripe", "paymob", "paymob_installment"];
    if (!validPaymentMethods.includes(paymentMethod.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Accepted: ${validPaymentMethods.join(", ")}`,
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Validate stock availability and calculate prices
      let itemsPrice = 0;
      let shippingPrice = 0;
      let taxPrice = 0;
      let totalPrice = 0;
      let couponDiscount = 0;
      let installationPrice = 0;

      const validatedItems = [];
      const installationFor = [];
      const requiredProducts = new Map();

      const getBaseUnitPrice = (product) => {
        return product.saleActive
          ? product.price * (1 - product.salePercentage / 100)
          : product.price;
      };

      const getUnitPrice = (product, quantity = 1) => {
        const basePrice = getBaseUnitPrice(product);
        const rules = Array.isArray(product.bulkPricing)
          ? product.bulkPricing
          : [];
        const applicable = rules
          .filter((rule) => rule.minQty <= quantity)
          .sort((a, b) => b.minQty - a.minQty)[0];
        if (!applicable) return basePrice;
        return Math.min(basePrice, applicable.unitPrice);
      };

      const addRequiredProduct = (product, quantity) => {
        const key = product._id.toString();
        if (requiredProducts.has(key)) {
          requiredProducts.get(key).quantity += quantity;
          return;
        }
        requiredProducts.set(key, { product, quantity });
      };

      for (const item of orderItems) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: `Product ${item.product} not found`,
          });
        }

        // An order belongs to exactly one store. The checkout page already
        // refuses a mixed cart, and the collection branch below already
        // rejects a bundle from another store — but nothing checked loose
        // products, so a request could name one store and carry another's
        // items. That order then showed up for both vendors, each seeing the
        // other's products, prices and the buyer's contact details.
        if (String(product.store) !== String(store)) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `${product.name} does not belong to the store this order is for`,
          });
        }

        addRequiredProduct(product, item.quantity);

        const itemPrice = getUnitPrice(product, item.quantity);
        itemsPrice += itemPrice * item.quantity;

        validatedItems.push({
          product: item.product,
          quantity: item.quantity,
          price: itemPrice,
          salePercentage: product.saleActive ? product.salePercentage : 0,
          couponDiscount: 0,
        });

        // Same rule as bundles: the price comes from the product, and asking
        // for fitting on something that doesn't offer it costs nothing rather
        // than erroring — the rest of the order is still perfectly valid.
        const productFee = installationFee(
          product,
          item.installation,
          item.quantity
        );
        if (productFee > 0) {
          installationPrice += productFee;
          installationFor.push({
            kind: "product",
            product: product._id,
            name: product.name,
            quantity: item.quantity,
            price: productFee,
          });
        }
      }

      for (const bundle of collectionItems) {
        const collection = await Collection.findById(bundle.collection)
          .populate("items.product")
          .session(session);
        if (!collection || !collection.isActive) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: `Collection ${bundle.collection} not found`,
          });
        }

        if (String(collection.store) !== String(store)) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Collection store does not match order store",
          });
        }

        const collectionQty = bundle.quantity || 1;
        // Line overrides win over the catalogue price — see
        // utils/collectionPricing.js. Computing this any other way here would
        // let the allocation below disagree with the total the customer was
        // shown on the collection page.
        const originalTotal = collectionItemsTotal(collection.items);

        if (collection.bundlePrice <= 0 || collection.bundlePrice > originalTotal) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Invalid bundle price for collection ${collection.name}`,
          });
        }

        for (const item of collection.items) {
          const product = item.product;
          const totalQty = item.quantity * collectionQty;
          addRequiredProduct(product, totalQty);

          const unitPrice = lineUnitPrice(item, product);
          const itemTotal = unitPrice * item.quantity;
          const proportion = originalTotal === 0 ? 0 : itemTotal / originalTotal;
          const allocatedTotal = collection.bundlePrice * proportion;
          const allocatedUnitPrice =
            item.quantity === 0 ? 0 : allocatedTotal / item.quantity;

          itemsPrice += allocatedUnitPrice * totalQty;

          validatedItems.push({
            product: product._id,
            collection: collection._id,
            collectionName: collection.name,
            quantity: totalQty,
            price: allocatedUnitPrice,
            salePercentage: 0,
            couponDiscount: 0,
          });
        }

        // Fitting is priced from the collection, never from the request, so a
        // hand-made order can't fit itself for free — or bill itself for a
        // service this bundle doesn't offer.
        const fee = installationFee(
          collection,
          bundle.installation,
          collectionQty
        );
        if (fee > 0) {
          installationPrice += fee;
          installationFor.push({
            kind: "collection",
            collection: collection._id,
            name: collection.name,
            quantity: collectionQty,
            price: fee,
          });
        }
      }

      for (const { product, quantity } of requiredProducts.values()) {
        if (product.stock < quantity) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}. Please remove this item from your cart or reduce the quantity.`,
          });
        }
      }

      // Step 2: Validate and apply coupon if provided
      let appliedCoupon = null;
      if (couponCode) {
        const coupon = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          isActive: true,
          // Either this store's own coupon, or a platform code that belongs to
          // no store. The student programme mints the second kind; before it
          // existed every coupon had a store and this filter was just `store`,
          // which would have made a student code unfindable at checkout while
          // still validating in the cart.
          $or: [{ store }, { store: null }],
        }).session(session);

        if (!coupon) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Invalid coupon code",
          });
        }

        // Personal codes are checked against the buyer here as well as in the
        // cart preview: the preview is advice, this is the charge.
        if (coupon.assignedUser && String(coupon.assignedUser) !== String(req.user._id)) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Invalid coupon code",
          });
        }

        // Check if coupon is valid
        if (!coupon.isValid) {
          await session.abortTransaction();
          let message = "Coupon is not valid";
          const now = new Date();
          if (now < coupon.startDate) message = "Coupon has not started yet";
          else if (now > coupon.endDate) message = "Coupon has expired";
          else if (
            coupon.usageLimit &&
            coupon.usageCount >= coupon.usageLimit
          ) {
            message = "Coupon usage limit exceeded";
          }
          return res.status(400).json({ success: false, message });
        }

        // Check minimum purchase
        if (itemsPrice < coupon.minimumPurchase) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Minimum purchase of $${coupon.minimumPurchase} required for this coupon`,
          });
        }

        // Check if coupon applies to any items
        let applicableSubtotal = 0;
        for (let i = 0; i < validatedItems.length; i++) {
          const item = validatedItems[i];
          const product = await Product.findById(item.product).session(session);
          if (coupon.canApplyToProduct(product._id, product.category, product.audience)) {
            applicableSubtotal += item.price * item.quantity;
          }
        }

        if (applicableSubtotal === 0) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Coupon does not apply to any items in your cart",
          });
        }

        // Calculate discount
        couponDiscount = coupon.calculateDiscount(applicableSubtotal);
        appliedCoupon = coupon;

        // Distribute discount proportionally to applicable items
        let remainingDiscount = couponDiscount;
        for (let i = 0; i < validatedItems.length; i++) {
          const item = validatedItems[i];
          const product = await Product.findById(item.product).session(session);
          if (coupon.canApplyToProduct(product._id, product.category, product.audience)) {
            const itemTotal = item.price * item.quantity;
            const proportion = itemTotal / applicableSubtotal;
            const itemDiscount = Math.min(
              remainingDiscount * proportion,
              itemTotal
            );
            validatedItems[i].couponDiscount = itemDiscount;
            remainingDiscount -= itemDiscount;
          }
        }
      }

      // Step 2c: Compute shipping authoritatively from the address governorate
      // (never trust a client-sent shipping price).
      const shippingSettings = await getShippingSettings();
      const addressDoc = await Address.findById(shippingAddress)
        .select("city state")
        .session(session);
      // Prefer live carrier rates when configured (Accurate, then Bosta); fall
      // back to the admin zone rates. Honor a free-shipping threshold regardless
      // of source.
      const freeByThreshold =
        shippingSettings?.enabled !== false &&
        Number(shippingSettings?.freeShippingThreshold) > 0 &&
        itemsPrice >= Number(shippingSettings.freeShippingThreshold);
      let liveFee = null;
      if (!freeByThreshold && isAccurateEnabled()) {
        liveFee = await getAccurateShippingFee(addressDoc || {}, itemsPrice);
      }
      if (liveFee == null && !freeByThreshold && isBostaEnabled()) {
        liveFee = await getBostaShippingFee(addressDoc || {});
      }
      shippingPrice =
        liveFee != null
          ? liveFee
          : resolveShippingFee(shippingSettings, addressDoc || {}, itemsPrice);

      // Calculate final prices. Fitting is added after the discount because a
      // coupon discounts goods, not labour — folding it into itemsPrice would
      // quietly hand out a percentage off the fitter's day as well.
      const discountPrice = couponDiscount; // Total discount applied
      totalPrice =
        itemsPrice + shippingPrice + taxPrice + installationPrice - discountPrice;

      // Step 2b: Redeem loyalty points (1 point = POINT_VALUE_EGP). Clamp to the
      // user's balance and to the order total so it can never go negative.
      let pointsRedeemed = 0;
      const requestedPoints = Math.floor(Number(pointsToRedeem) || 0);
      if (requestedPoints > 0) {
        const buyer = await User.findById(req.user._id)
          .select("loyaltyPoints")
          .session(session);
        const balance = Math.max(0, buyer?.loyaltyPoints || 0);
        const maxByTotal = Math.floor(totalPrice / POINT_VALUE_EGP);
        pointsRedeemed = Math.max(0, Math.min(requestedPoints, balance, maxByTotal));
        totalPrice = Math.max(0, totalPrice - pointsRedeemed * POINT_VALUE_EGP);
      }

      // Step 3: Create the order
      const order = new Order({
        user: req.user._id,
        orderItems: validatedItems,
        shippingAddress,
        paymentMethod,
        store,
        itemsPrice,
        shippingPrice,
        taxPrice,
        installationPrice,
        installationFor,
        // An order with fitting joins the queue the moment it is placed;
        // everything else stays out of it.
        installationStatus: installationPrice > 0 ? "pending" : "none",
        totalPrice,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount,
        discountPrice,
        pointsRedeemed,
        statusTimeline: [
          { status: "pending", note: "Order placed", updatedBy: req.user._id },
        ],
      });

      const savedOrder = await order.save({ session });

      // Step 4: Update coupon usage count if coupon was applied
      if (appliedCoupon) {
        await Coupon.findByIdAndUpdate(
          appliedCoupon._id,
          { $inc: { usageCount: 1 } },
          { session }
        );
      }

      // Step 5: Update product stock and sold count
      const stockUpdates = new Map();
      for (const item of validatedItems) {
        const key = item.product.toString();
        if (stockUpdates.has(key)) {
          stockUpdates.get(key).quantity += item.quantity;
          continue;
        }
        stockUpdates.set(key, { productId: item.product, quantity: item.quantity });
      }

      for (const { productId, quantity } of stockUpdates.values()) {
        await Product.findByIdAndUpdate(
          productId,
          {
            $inc: {
              stock: -quantity,
              soldCount: quantity,
            },
          },
          { session }
        );
      }

      // Step 6: Clear user's cart and deduct any redeemed points
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: { cart: [] },
          ...(pointsRedeemed > 0
            ? { $inc: { loyaltyPoints: -pointsRedeemed } }
            : {}),
        },
        { session }
      );

      // Commit the transaction
      await session.commitTransaction();

      // Create notifications
      try {
        const customerNotification = await Notification.create({
          user: savedOrder.user,
          title: "Order Placed",
          message: `Your order #${savedOrder._id} has been placed successfully.`,
          type: "success",
        });
        emitNotificationCreated(customerNotification.user, customerNotification);

        // Notify store owner(s) about new order
        const storeDoc = await Store.findById(savedOrder.store).populate(
          "owner"
        );
        if (storeDoc && storeDoc.owner) {
          const customer = await User.findById(savedOrder.user);
          const vendorNotification = await Notification.create({
            user: storeDoc.owner._id,
            title: "New Order Received",
            message: `You have received a new order #${savedOrder._id} from ${
              customer?.name || "A customer"
            }.`,
            type: "success",
          });
          emitNotificationCreated(vendorNotification.user, vendorNotification);
        }
      } catch (error) {
        console.error("Error creating order notifications:", error);
      }

      logAudit(req, "order.placed", "order", savedOrder._id, {
        total: savedOrder.totalPrice ?? savedOrder.total ?? savedOrder.totalAmount,
        paymentMethod,
        items: (orderItems?.length || 0) + (collectionItems?.length || 0),
      }, { category: "customer" });

      res.status(201).json({
        success: true,
        order: savedOrder,
        message: "Order created successfully",
      });

      // Confirmation email + SMS are best-effort and run after the response.
      // They must not share the try/catch above: the order is already
      // committed and answered, so a failure here has to stay contained.
      // Previously a throw landed in that catch, which tried to abort an
      // already-committed transaction and then write a 500 onto a response
      // whose headers were long gone — crashing the function on what should
      // have been a successful order.
      try {
        const customer = await User.findById(savedOrder.user);
        if (customer) {
          const populatedOrder = await Order.findById(savedOrder._id).populate(
            "orderItems.product"
          );
          sendOrderConfirmationEmail(customer, populatedOrder).catch((err) =>
            console.error("Failed to send order confirmation email:", err)
          );
          if (customer.phoneNumber) {
            const orderNum = savedOrder._id.toString().slice(-8).toUpperCase();
            sendSMS(
              customer.phoneNumber,
              orderSmsText(customer.lang, "confirmed", orderNum)
            );
          }
        }
      } catch (notifyError) {
        console.error("Post-order notification failed:", notifyError);
      }
    } catch (error) {
      // Abort transaction on any error
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      console.error("Error creating order:", error);

      if (res.headersSent) {
        return;
      }
      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  }
);

export const getOrders = controllerWrapper("getOrders", async (req, res) => {
  let query = {};
  let populateOptions = ["user", "orderItems.product", "shippingAddress"];

  // Handle different user roles. This asks whether the caller reaches every
  // store rather than testing for the literal role "admin": that test matched
  // neither super_admins nor custom staff roles, and both then fell through to
  // the customer branch below and were served only orders they placed
  // themselves — an empty list, for staff who don't shop here.
  if (await reachesAllStores(req.user)) {
    // Staff get all orders
    query = {};
  } else if (req.user.role === "store") {
    // Store/vendor gets orders that contain products from their store(s)
    const vendorStores = await Store.find({ owner: req.user._id }).select(
      "_id"
    );
    const storeIds = vendorStores.map((store) => store._id);

    if (storeIds.length === 0) {
      // Vendor has no stores, return empty array
      return res.status(200).json({ success: true, orders: [] });
    }

    // Orders the vendor's store owns. This used to be an $or that also matched
    // any order merely *containing* one of their products, which is how a
    // vendor ended up reading another vendor's order — total, line items and
    // the buyer's name, email and phone — whenever the two got mixed into one
    // order. Ownership is the `store` field, and createOrder now guarantees
    // every line in an order comes from it.
    query = { store: { $in: storeIds } };
  } else {
    // Regular customers get only their own orders
    query = { user: req.user._id };
  }

  const orders = await Order.find(query)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, orders });
});

/**
 * Which stores this caller's view of orders is limited to.
 *
 * `null` means "no limit" — platform staff. Returns an empty array for a
 * vendor with no store, which callers must treat as "show nothing" rather than
 * as "show everything"; an empty `$in` matches nothing, so that falls out
 * correctly, but it is worth naming.
 */
/** The statuses that mean "this is a real fitting job". "none" is not one. */
const JOB_STATUSES = [
  "pending",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];

const storeScopeFor = async (user) => {
  if (await reachesAllStores(user)) return null;
  const stores = await Store.find({ owner: user._id }).select("_id");
  return stores.map((s) => s._id);
};

/**
 * The fitting queue: orders where the buyer asked us to install.
 *
 * Gated on `installations.view`. Vendors see only their own store's jobs —
 * the same scoping as the orders list, for the same reason: an order carries
 * the buyer's name, phone and address.
 */
export const getInstallationOrders = controllerWrapper(
  "getInstallationOrders",
  async (req, res) => {
    const { status } = req.query;

    // An explicit allowlist, not `$ne: "none"`. In Mongo `$ne` also matches
    // documents where the field is absent, so every order placed before this
    // field existed answered to it and the queue filled with orders that have
    // no fitting on them at all.
    const query = { installationStatus: { $in: JOB_STATUSES } };
    if (status && status !== "all") query.installationStatus = status;

    const scope = await storeScopeFor(req.user);
    if (scope) query.store = { $in: scope };

    const orders = await Order.find(query)
      .populate("user", "name email phoneNumber")
      .populate("shippingAddress")
      .populate("store", "name")
      .sort({ installationScheduledAt: 1, createdAt: -1 });

    // Counts per status for the filter tabs, over the same scope so a vendor's
    // badges match a vendor's list.
    const countScope = scope ? { store: { $in: scope } } : {};
    const rows = await Order.aggregate([
      { $match: { ...countScope, installationStatus: { $in: JOB_STATUSES } } },
      { $group: { _id: "$installationStatus", n: { $sum: 1 } } },
    ]);
    const counts = rows.reduce((acc, r) => ({ ...acc, [r._id]: r.n }), {});

    res.status(200).json({ success: true, orders, counts });
  }
);

/**
 * Move a fitting job along, and optionally book a date or leave a note.
 * Gated on `installations.manage`.
 */
export const updateInstallation = controllerWrapper(
  "updateInstallation",
  async (req, res) => {
    const { status, scheduledAt, notes } = req.body;
    const ALLOWED = JOB_STATUSES;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    // "none" is not a job, and neither is a missing value on an order placed
    // before the field existed. Letting either be edited would quietly add an
    // order with no fitting to the queue, where the team would expect to
    // turn up.
    if (!JOB_STATUSES.includes(order.installationStatus)) {
      return res.status(400).json({
        success: false,
        message: "This order has no installation",
      });
    }

    const scope = await storeScopeFor(req.user);
    if (scope && !scope.some((id) => String(id) === String(order.store))) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this installation",
      });
    }

    if (status !== undefined) {
      if (!ALLOWED.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${ALLOWED.join(", ")}`,
        });
      }
      order.installationStatus = status;
    }
    if (scheduledAt !== undefined) {
      order.installationScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }
    if (notes !== undefined) order.installationNotes = String(notes).slice(0, 1000);

    await order.save();

    logAudit(req, "installation.update", "order", order._id, {
      status: order.installationStatus,
      scheduledAt: order.installationScheduledAt,
    });

    res.status(200).json({ success: true, order });
  }
);

export const getOrderById = controllerWrapper(
  "getOrderById",
  async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate("user")
      .populate("shippingAddress")
      .populate("orderItems.product")
      .populate("statusTimeline.updatedBy", "name");
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Ownership: customers may only view their own orders; store users only
    // orders for stores they own; admins/super_admins any order. Without this
    // any authenticated user could read any order (and its buyer) by id.
    const role = req.user.role;
    if (role !== "admin" && role !== "super_admin") {
      if (role === "store") {
        const myStores = await Store.find({ owner: req.user._id }).select("_id");
        const ownsStore = myStores.some(
          (s) => s._id.toString() === order.store?.toString()
        );
        if (!ownsStore)
          return res
            .status(403)
            .json({ success: false, message: "Not authorized to view this order" });
      } else {
        const orderUserId =
          order.user?._id?.toString() ?? order.user?.toString();
        if (orderUserId !== req.user._id.toString())
          return res
            .status(403)
            .json({ success: false, message: "Not authorized to view this order" });
      }
    }

    res.status(200).json({ success: true, order });
  }
);

export const getUserOrders = controllerWrapper(
  "getUserOrders",
  async (req, res) => {
    const orders = await Order.find({ user: req.params.userId }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, orders });
  }
);

export const getMyOrders = controllerWrapper(
  "getMyOrders",
  async (req, res) => {
    const orders = await Order.find({ user: req.user._id })
      .populate("shippingAddress")
      .populate("orderItems.product")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  }
);

export const updateOrderStatus = controllerWrapper(
  "updateOrderStatus",
  async (req, res) => {
    const { status, note } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        $push: {
          statusTimeline: { status, note, updatedBy: req.user?._id },
        },
      },
      { new: true }
    );
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Award loyalty points the first time an order reaches "delivered".
    if (status === "delivered") {
      await awardPointsForDelivery(order._id);
    }

    // Auto-create an Accurate waybill the first time an order is marked shipped.
    // Fail-safe: a carrier error is logged but never blocks the status update.
    if (status === "shipped" && isAccurateEnabled() && !order.trackingNumber) {
      try {
        const populated = await Order.findById(order._id)
          .populate("shippingAddress")
          .populate("user");
        const shipment = await createAccurateShipment({
          order: populated,
          address: populated.shippingAddress,
          customer: populated.user,
        });
        await Order.findByIdAndUpdate(order._id, {
          trackingNumber: shipment.code,
          ...(shipment.trackingUrl ? { trackingUrl: shipment.trackingUrl } : {}),
          shipment: {
            provider: "accurate",
            id: shipment.id,
            code: shipment.code,
            status: shipment.status,
            syncedAt: new Date(),
          },
        });
        order.trackingNumber = shipment.code;
        if (shipment.trackingUrl) order.trackingUrl = shipment.trackingUrl;
      } catch (err) {
        console.error("[Accurate] auto shipment on 'shipped' failed:", err.message);
      }
    }

    logAudit(req, "order.status_changed", "order", order._id, { status, note });

    // Create notification for customer about status change
    const statusMessages = {
      confirmed: "confirmed",
      processing: "is being processed",
      shipped: "has been shipped",
      out_for_delivery: "is out for delivery",
      delivered: "has been delivered",
      cancelled: "has been cancelled",
    };

    const message = statusMessages[status] || "status has been updated";

    try {
      await Notification.create({
        user: order.user,
        title: "Order Status Update",
        message: `Your order #${order._id} ${message}.`,
        type: status === "cancelled" ? "warning" : "info",
      });

      // Send status update email (non-blocking)
      const customer = await User.findById(order.user);
      if (customer) {
        sendOrderStatusEmail(customer, order, status).catch((err) =>
          console.error("Failed to send order status email:", err)
        );
        if (customer.phoneNumber && (status === "shipped" || status === "delivered")) {
          const orderNum = order._id.toString().slice(-8).toUpperCase();
          sendSMS(customer.phoneNumber, orderSmsText(customer.lang, status, orderNum));
        }
      }
    } catch (error) {
      console.error("Error creating order status notification:", error);
    }

    res.status(200).json({ success: true, order });
  }
);

export const markOrderPaid = controllerWrapper(
  "markOrderPaid",
  async (req, res) => {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        isPaid: true,
        paidAt: new Date(),
        paymentResult: req.body.paymentResult,
        $push: {
          statusTimeline: {
            status: "paid",
            note: "Payment confirmed",
            updatedBy: req.user?._id,
          },
        },
      },
      { new: true }
    );
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  }
);

export const markOrderDelivered = controllerWrapper(
  "markOrderDelivered",
  async (req, res) => {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        isDelivered: true,
        deliveredAt: new Date(),
        status: "delivered",
        $push: {
          statusTimeline: {
            status: "delivered",
            note: "Order delivered",
            updatedBy: req.user?._id,
          },
        },
      },
      { new: true }
    );
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    await awardPointsForDelivery(order._id);

    res.status(200).json({ success: true, order });
  }
);

export const cancelOrder = controllerWrapper(
  "cancelOrder",
  async (req, res) => {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "cancelled",
        cancelled: true,
        $push: {
          statusTimeline: {
            status: "cancelled",
            note: req.body?.reason || "Order cancelled",
            updatedBy: req.user?._id,
          },
        },
      },
      { new: true }
    );
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    logAudit(req, "order.cancelled", "order", order._id, { reason: req.body?.reason });
    res.status(200).json({ success: true, order });
  }
);

export const deleteOrder = controllerWrapper(
  "deleteOrder",
  async (req, res) => {
    // Find the order first to check permissions
    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Check permissions based on user role. Same reasoning as getOrders — a
    // literal "admin" test excluded super_admins and custom staff roles.
    if (await reachesAllStores(req.user)) {
      // Staff can delete any order
    } else if (req.user.role === "store") {
      // Store/vendor can only delete orders that contain products from their stores
      const vendorStores = await Store.find({ owner: req.user._id }).select(
        "_id"
      );
      const storeIds = vendorStores.map((store) => store._id);

      if (storeIds.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to delete this order",
        });
      }

      // Check if the order belongs to one of the vendor's stores
      const hasPermission =
        storeIds.includes(order.store) ||
        (await Product.find({
          _id: { $in: order.orderItems.map((item) => item.product) },
          store: { $in: storeIds },
        }).countDocuments()) > 0;

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to delete this order",
        });
      }
    } else {
      // Regular customers cannot delete orders (they can only cancel them)
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete orders",
      });
    }

    // Check if order can be deleted (only pending or cancelled orders)
    if (!["pending", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Only pending or cancelled orders can be deleted",
      });
    }

    // Delete the order
    await Order.findByIdAndDelete(req.params.id);
    logAudit(req, "order.deleted", "order", order._id);

    res
      .status(200)
      .json({ success: true, message: "Order deleted successfully" });
  }
);
