import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import { PAYMENT_METHODS, isPaymentMethod } from "../config/paymentMethods.js";
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
import {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendNewOrderEmail,
} from "../utils/email.js";
import { sendSMS, orderSmsText } from "../utils/sms.js";

/** What the account pages print: the last eight characters, in capitals. */
const shortOrderId = (id) => String(id).slice(-8).toUpperCase();
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
    // The same list the validator in front of this route uses, and the same
    // list the checkout page renders. It lived here as a literal, one entry
    // short of the page and five entries longer than the validator.
    if (!isPaymentMethod(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Accepted: ${PAYMENT_METHODS.join(", ")}`,
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

      /**
       * A product with no price is not free — it is quoted.
       *
       * The catalogue carries items whose price is agreed per order, and they
       * are stored with a price of zero because that is what "not set" looks
       * like in a Number field. The storefront offers those a quote instead of
       * a buy button, but nothing stopped a request going straight to this
       * endpoint, and the arithmetic below would have happily totalled a
       * fifty-thousand-pound laptop at nothing.
       */
      const assertPriced = (product) => {
        if (getBaseUnitPrice(product) > 0) return;
        const err = new Error(
          `"${product.name}" is priced on request. Ask for a quotation instead of ordering it directly.`,
        );
        err.status = 400;
        throw err;
      };

      const getUnitPrice = (product, quantity = 1) => {
        assertPriced(product);
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
            // EGP. This said "$500" on a shop that has only ever traded in
            // Egyptian pounds, to a customer being told why their coupon was
            // refused — so the one number they needed to act on was quoted in
            // the wrong currency, and 500 pounds read as roughly 25.
            message: `Minimum purchase of ${coupon.minimumPurchase} EGP required for this coupon`,
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
      // Scoped to the buyer, and required to exist.
      //
      // findById took whatever id it was handed. Two things followed. An id
      // that was not an address at all still produced an order — `|| {}`
      // below quietly stood in for it — leaving a delivery nobody could
      // make against a reference pointing at nothing. And an id belonging to
      // somebody else was accepted onto your own order, which getOrderById
      // then populates for you: any signed-in customer could read another's
      // name, phone and street by putting their address id on an order of
      // their own.
      const addressDoc = await Address.findOne({
        _id: shippingAddress,
        user: req.user._id,
      })
        .select("city state")
        .session(session);

      if (!addressDoc) {
        const err = new Error(
          "That delivery address could not be found on your account. Pick one of your saved addresses.",
        );
        err.status = 400;
        throw err;
      }
      // Prefer live carrier rates when configured (Accurate, then Bosta); fall
      // back to the admin zone rates. Honor a free-shipping threshold regardless
      // of source.
      /*
        "Charge shipping" off means off, including for the carriers.

        `enabled !== false` was folded into freeByThreshold, which reads as a
        kill switch and is the opposite of one: with shipping disabled the
        threshold clause went false, so control fell through to the carrier
        lookups below, and `liveFee != null` then beat resolveShippingFee — the
        one place that honours `enabled` by returning 0. Turning shipping off
        therefore charged the courier's own quote, which is the number the
        switch exists to stop charging.

        Nobody has met this yet because no carrier is configured. It would have
        arrived with the first one.
      */
      const shippingOff = shippingSettings?.enabled === false;
      const freeByThreshold =
        !shippingOff &&
        Number(shippingSettings?.freeShippingThreshold) > 0 &&
        itemsPrice >= Number(shippingSettings.freeShippingThreshold);
      const skipCarriers = shippingOff || freeByThreshold;
      let liveFee = null;
      if (!skipCarriers && isAccurateEnabled()) {
        liveFee = await getAccurateShippingFee(addressDoc, itemsPrice);
      }
      if (liveFee == null && !skipCarriers && isBostaEnabled()) {
        liveFee = await getBostaShippingFee(addressDoc);
      }
      shippingPrice =
        liveFee != null
          ? liveFee
          : resolveShippingFee(shippingSettings, addressDoc, itemsPrice);

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
        // The short form is what the account pages print and what a
        // customer would read out on the phone; the full ObjectId was
        // twenty-four characters of noise in the middle of a sentence.
        const shortId = shortOrderId(savedOrder._id);
        const customerNotification = await Notification.create({
          user: savedOrder.user,
          title: "Order Placed",
          message: `Your order #${shortId} has been placed successfully.`,
          type: "success",
          link: `/account?tab=orders&order=${savedOrder._id}`,
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
            message: `You have received a new order #${shortId} from ${
              customer?.name || "A customer"
            }.`,
            type: "success",
            // Staff read this one, so it belongs in the dashboard.
            link: "/dashboard/order",
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

        /*
          And tell the shop, which nothing did.

          A Notification document is created for the store's owner above and it
          shows in the dashboard bell — that was the whole of it. Nothing left
          the site, so the shop found out it had an order whenever somebody next
          opened the dashboard and looked. On a shop whose only working payment
          method is cash on delivery, the order has to be packed and sent before
          anyone is paid at all.

          Best-effort and unawaited, in the same block and for the same reason
          as the customer's own confirmation: the order is committed and the
          response is already sent, so nothing here may throw into it.
        */
        sendNewOrderEmail(
          savedOrder,
          customer,
          (orderItems?.length || 0) + (collectionItems?.length || 0)
        ).catch((err) => console.error("Failed to tell the shop about the order:", err));
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
      // A refusal the caller can act on — an unpriced product, a product that
      // is not the store's — is a 400 and says so plainly. Only a genuine
      // failure is a 500, so the uptime monitor pages on the second and not
      // on somebody trying to buy something that is quoted.
      const status = error.status || 500;
      res.status(status).json({
        success: false,
        message: status === 500 ? "Failed to create order" : error.message,
        ...(status === 500 ? { error: error.message } : {}),
      });
    } finally {
      session.endSession();
    }
  }
);

/**
 * Narrow a query to orders containing one of this account's products.
 *
 * A category manager holds orders.view so they can work their own section,
 * and without this that would mean every order in the shop — the same reach
 * an administrator has. Their section is the point: they see an order
 * because something of theirs is in it.
 *
 * Returns the filter unchanged for an unscoped account, which is every
 * administrator.
 */
const narrowToScope = async (user, filter) => {
  const { scopedCategoryIds } = await import("../utils/categoryScope.js");
  const allowed = await scopedCategoryIds(user);
  if (!allowed) return filter;

  // The ids only — the products themselves are not wanted here, and this
  // runs on an indexed field.
  const productIds = await Product.find({
    category: { $in: [...allowed].map((id) => new mongoose.Types.ObjectId(id)) },
  }).distinct("_id");

  return { ...filter, "orderItems.product": { $in: productIds } };
};

export const getOrders = controllerWrapper("getOrders", async (req, res) => {
  let query = {};
  let populateOptions = ["user", "orderItems.product", "shippingAddress"];

  // Handle different user roles. This asks whether the caller reaches every
  // store rather than testing for the literal role "admin": that test matched
  // neither super_admins nor custom staff roles, and both then fell through to
  // the customer branch below and were served only orders they placed
  // themselves — an empty list, for staff who don't shop here.
  if (await reachesAllStores(req.user)) {
    // Staff get all orders — or, for somebody put in charge of part of the
    // catalogue, the orders their part appears in.
    query = await narrowToScope(req.user, {});
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
    // orders for stores they own; staff put in charge of part of the
    // catalogue only orders their part appears in; admins/super_admins any
    // order. Without this any authenticated user could read any order (and
    // its buyer) by id.
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
        const isBuyer = orderUserId === req.user._id.toString();

        // A section manager reads an order because something of theirs is in
        // it. Checked against the order in hand rather than by re-querying:
        // orderItems.product is already populated above.
        const { scopedCategoryIds } = await import("../utils/categoryScope.js");
        const allowed = await scopedCategoryIds(req.user);
        const touchesTheirSection =
          Boolean(allowed) &&
          (order.orderItems || []).some((item) => {
            const category = item.product?.category;
            if (!category) return false;
            return allowed.has(String(category._id || category));
          });

        if (!isBuyer && !touchesTheirSection)
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

/**
 * Give back what an order was holding.
 *
 * Placing the order took stock off the products, incremented their
 * soldCount, spent one use of a limited coupon, and deducted the loyalty
 * points the customer chose to redeem. Cancelling returned none of it. So
 * every cancellation quietly destroyed inventory that was never shipped,
 * inflated the numbers behind the best-seller rails, burned a use of a
 * coupon that may only have had a few, and confiscated the customer's
 * points — on a catalogue whose stock is already a placeholder, a run of
 * cancellations walks products toward a false out-of-stock.
 *
 * Claimed with a conditional update rather than checked and then written.
 * Two people cancelling the same order at the same moment would otherwise
 * both pass the check and both roll back, which invents stock. The claim is
 * the same operation as the test, so exactly one of them wins.
 *
 * Stock is the one thing not returned for an order that was delivered: the
 * goods are with the customer, and putting them back on the shelf because
 * the order was later marked cancelled would be counting them twice. That is
 * a return, and returns restock on their own terms. The coupon and the points
 * come back either way — the sale is not happening.
 */
const releaseOrderHolds = async (orderId, req) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, holdsReleased: { $ne: true } },
    { $set: { holdsReleased: true, holdsReleasedAt: new Date() } },
    { new: true }
  );
  if (!order) return null; // already released, or gone

  const wasDelivered = order.isDelivered === true;
  const restored = { stock: 0, points: 0, coupon: null, deliveredSoNoStock: wasDelivered };

  if (!wasDelivered) {
    // The same pooling the order used, so a product listed twice in one
    // order gets both quantities back in one update rather than one.
    const perProduct = new Map();
    for (const item of order.orderItems || []) {
      if (!item?.product) continue;
      const key = String(item.product);
      perProduct.set(key, (perProduct.get(key) || 0) + (item.quantity || 0));
    }
    for (const [productId, quantity] of perProduct) {
      if (!quantity) continue;
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: quantity, soldCount: -quantity },
      });
      // soldCount is a running total that predates this rollback, so an old
      // order can drive it below zero. Clamped rather than left negative,
      // which would read as a product that has been un-sold.
      await Product.updateOne(
        { _id: productId, soldCount: { $lt: 0 } },
        { $set: { soldCount: 0 } }
      );
      restored.stock += quantity;
    }
  }

  if (order.couponCode) {
    const coupon = await Coupon.findOneAndUpdate(
      { code: order.couponCode },
      { $inc: { usageCount: -1 } },
      { new: true }
    );
    if (coupon) {
      if (coupon.usageCount < 0) {
        await Coupon.updateOne({ _id: coupon._id }, { $set: { usageCount: 0 } });
      }
      restored.coupon = order.couponCode;
    }
  }

  if (order.pointsRedeemed > 0 && order.user) {
    await User.updateOne(
      { _id: order.user },
      { $inc: { loyaltyPoints: order.pointsRedeemed } }
    );
    restored.points = order.pointsRedeemed;
  }

  if (req) await logAudit(req, "order.holds_released", "order", String(order._id), restored);
  return restored;
};

/**
 * Keep `isDelivered`/`deliveredAt` — and, for cash on delivery, `isPaid`/
 * `paidAt` — saying the same thing as `status`.
 *
 * An order's delivery is written down twice: once as a status, once as a pair
 * of flags. Everything that counts money reads the flags — payouts filter on
 * `isDelivered && isPaid`, a store's revenue on `isPaid`, the review-request
 * cron on `isDelivered` — while everything a person looks at reads the status.
 *
 * For a long time only the status was ever written. Endpoints existed that set
 * the flags — PUT /orders/:id/pay and /:id/deliver — and store actions calling
 * them, but no component anywhere called the store actions, so payouts computed
 * zero, store revenue read zero, and no review request could be sent.
 *
 * Arriving at delivered was fixed. Leaving it was not, and the
 * status can be moved in any direction: the dashboard offers a plain list of
 * radio buttons with no notion of forwards. So an order marked delivered by
 * mistake and put back to "processing" kept `isDelivered: true` for good. It
 * read as in-the-warehouse to the customer, as earned to the vendor's payout,
 * as revenue to the store's figures, and as returnable to the returns
 * endpoint — which admits an order on `isDelivered` alone — and three days
 * later the cron emailed the customer to review something they never got.
 *
 * Both directions now. What is deliberately *not* undone:
 *
 *   - Loyalty points. `awardPointsForDelivery` is guarded by `pointsAwarded`,
 *     and by the time anyone notices the mistake the customer may have spent
 *     them. Taking back a balance somebody has already used is worse than
 *     leaving a few points given early.
 *   - A payment the gateway confirmed. `isPaid` is only cleared when this
 *     controller is the one that set it: cash on delivery, with no
 *     `paymentResult.id` from a gateway and no manual mark-as-paid behind it.
 *     An online order stays paid, because it is.
 *
 * Call this *after* `releaseOrderHolds` on a cancellation — that function
 * reads `isDelivered` to decide whether stock goes back on the shelf, and
 * goods that reached the customer must not.
 */
const reconcileDelivery = async (order) => {
  const arrived = order.status === "delivered";
  if (arrived === (order.isDelivered === true)) return null;

  if (arrived) {
    const settle = { isDelivered: true, deliveredAt: new Date() };
    // Cash on delivery is settled here because this is the moment the money
    // changes hands and there is no gateway to say so.
    if (order.paymentMethod === "cod" && !order.isPaid) {
      settle.isPaid = true;
      settle.paidAt = new Date();
    }
    await Order.updateOne({ _id: order._id }, { $set: settle });
    Object.assign(order, settle);
    return settle;
  }

  const unwind = { isDelivered: false, deliveredAt: null };
  const collectedOnDelivery =
    order.paymentMethod === "cod" && order.isPaid && !order.paymentResult?.id;
  if (collectedOnDelivery) {
    unwind.isPaid = false;
    unwind.paidAt = null;
  }
  await Order.updateOne({ _id: order._id }, { $set: unwind });
  Object.assign(order, unwind);
  return unwind;
};

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

    // This dropdown is how a cancellation actually happens — nothing in the
    // frontend calls the cancel route at all — so this is where the stock,
    // the coupon and the points have to come back.
    //
    // Before reconcileDelivery, not after: this reads `isDelivered` to decide
    // whether stock goes back on the shelf, and an order that reached the
    // customer must not put its goods back. Clearing the flag first would
    // restock every delivered order somebody later cancelled.
    if (status === "cancelled") {
      await releaseOrderHolds(order._id, req);
    }

    // Both directions — arriving at delivered, and leaving it. See the
    // function for what is deliberately not undone.
    await reconcileDelivery(order);

    // Auto-create an Accurate waybill the first time an order is marked shipped.
    // Fail-safe: a carrier error is logged but never blocks the status update.
    // Not for an order that has already been delivered. Statuses can be moved
    // in any direction — there is no transition graph — and a parcel that has
    // arrived does not need a waybill; asking the courier for one is how a
    // delivered cash order ends up shipped again with nothing to collect.
    if (
      status === "shipped" &&
      !order.isDelivered &&
      isAccurateEnabled() &&
      !order.trackingNumber
    ) {
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
        message: `Your order #${shortOrderId(order._id)} ${message}.`,
        type: status === "cancelled" ? "warning" : "info",
        link: `/account?tab=orders&order=${order._id}`,
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
    /*
      The hour the customer paid, recorded once.

      This wrote `paidAt: new Date()` on every call, so marking an order paid
      twice moved the payment's own timestamp to whenever the second call
      happened. A gateway that retries its webhook — which is what gateways do
      when they do not get a clean answer — was enough, and the books then said
      the money arrived at the moment of the retry.

      The conditional filter is the whole guard: an order that is already paid
      does not match, so nothing is written and `paidAt` keeps the hour it
      earned. Same shape as reconcileDelivery, for the same reason.
    */
    const claimed = await Order.findOneAndUpdate(
      { _id: req.params.id, isPaid: { $ne: true } },
      {
        isPaid: true,
        paidAt: new Date(),
        ...(req.body.paymentResult ? { paymentResult: req.body.paymentResult } : {}),
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

    // Not matched means either already paid or gone — the two are told apart
    // by looking, so a second webhook gets a 200 and its order, not a 404.
    const order = claimed || (await Order.findById(req.params.id));
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
    /*
      The status and the timeline entry only. The flags are left to
      reconcileDelivery below.

      This wrote `isDelivered: true, deliveredAt: new Date()` itself, which is
      not the same act twice: calling it again on an order already delivered
      moved `deliveredAt` forward to now. The review-request cron looks for
      orders delivered three days ago and the returns window counts from that
      date, so a second click — a retried request, a double-submit, a courier
      webhook replayed — quietly pushed both out by however long had passed.

      Kept in step with updateOrderStatus on purpose. Nothing calls this
      endpoint today — the dashboard moves the status through the dropdown
      instead — and two doors to the same act that disagree about what the act
      means is how the next person wires this one up and gets different books.
    */
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
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
    await reconcileDelivery(order);

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

    const restored = await releaseOrderHolds(order._id, req);
    // After releaseOrderHolds, which reads `isDelivered` to decide whether the
    // stock goes back. A cancelled order is not a delivered one, and leaving
    // the flag set kept it in the vendor's payout and the store's revenue.
    await reconcileDelivery(order);

    logAudit(req, "order.cancelled", "order", order._id, { reason: req.body?.reason });
    res.status(200).json({ success: true, order, restored });
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

    // Before the row goes, not after: once it is deleted there is nothing
    // left to read the quantities, the coupon code or the points off. A
    // pending order still holds all three; a cancelled one has released them
    // already and the claim inside makes the second call a no-op.
    const restored = await releaseOrderHolds(order._id, req);

    // Delete the order
    await Order.findByIdAndDelete(req.params.id);
    logAudit(req, "order.deleted", "order", order._id, { restored });

    res
      .status(200)
      .json({ success: true, message: "Order deleted successfully" });
  }
);
