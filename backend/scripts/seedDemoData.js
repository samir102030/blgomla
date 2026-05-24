import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import User from "../models/user.model.js";
import Store from "../models/store.model.js";
import Product from "../models/product.model.js";
import Address from "../models/address.model.js";
import Order from "../models/order.model.js";
import Coupon from "../models/coupon.model.js";
import Advertisement from "../models/advertisement.model.js";
import Subscriber from "../models/subscriber.model.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/belgomla";

// ── Demo footprint markers ──────────────────────────────────────────────────
// Every record this script creates is tagged so cleanupDemoData.js can remove
// exactly what was seeded — and nothing else. None of these markers surface to
// shoppers: ad markers live in the never-rendered `description`, coupons use a
// fixed code list, orders use admin-only `notes`, users/subscribers a domain.
export const DEMO = {
  userDomain: "@belgomla-demo.local",
  orderNote: "DEMO_SEED",
  adMarker: "[DEMO]",
  couponCodes: ["WELCOME10", "FLASH15", "SAVE100", "BULK20"],
};

const userDomainRe = new RegExp(
  DEMO.userDomain.replace(/[.]/g, "\\.") + "$",
  "i"
);
const adMarkerRe = /\[DEMO\]/;

// ── Demo content ────────────────────────────────────────────────────────────
const DEMO_CUSTOMERS = [
  { name: "Ahmed Saeed", city: "Cairo", address: "12 Tahrir St, Downtown" },
  { name: "Mona Khaled", city: "Giza", address: "5 Pyramids Rd, Haram" },
  { name: "Youssef Ibrahim", city: "Alexandria", address: "30 Corniche, Sidi Gaber" },
  { name: "Sara Mahmoud", city: "Mansoura", address: "8 Gomhoria St" },
  { name: "Omar Tarek", city: "Tanta", address: "22 El Geish St" },
  { name: "Nour Hassan", city: "Aswan", address: "3 Nile View St" },
  { name: "Khaled Abdelrahman", city: "Port Said", address: "17 El Gomhoreya" },
  { name: "Laila Samir", city: "Ismailia", address: "9 El Tahrir Sq" },
  { name: "Mostafa Ali", city: "Luxor", address: "44 Karnak St" },
  { name: "Heba Fawzy", city: "Zagazig", address: "11 El Galaa St" },
];

const ORDER_STATUSES = [
  "delivered", "delivered", "delivered", "shipped", "out_for_delivery",
  "processing", "confirmed", "delivered", "shipped", "processing",
  "delivered", "confirmed", "delivered", "shipped", "processing",
  "delivered", "out_for_delivery", "delivered",
];

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Remove every record previously created by this seeder. Assumes an open
 * mongoose connection. Exported so cleanupDemoData.js can reuse it.
 */
export async function wipeDemo() {
  const demoUsers = await User.find({ email: userDomainRe }).select("_id");
  const ids = demoUsers.map((u) => u._id);

  const result = {
    orders: (await Order.deleteMany({ notes: DEMO.orderNote })).deletedCount,
    addresses: (await Address.deleteMany({ user: { $in: ids } })).deletedCount,
    users: (await User.deleteMany({ _id: { $in: ids } })).deletedCount,
    ads: (await Advertisement.deleteMany({ description: adMarkerRe })).deletedCount,
    coupons: (await Coupon.deleteMany({ code: { $in: DEMO.couponCodes } })).deletedCount,
    subscribers: (await Subscriber.deleteMany({ email: userDomainRe })).deletedCount,
  };
  return result;
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(
    `✅ Connected to ${mongoose.connection.host}/${mongoose.connection.name}`
  );

  // Reset any prior demo footprint so re-runs stay idempotent.
  const wiped = await wipeDemo();
  console.log("🧹 Cleared prior demo data:", wiped);

  // ── Anchor records (reuse real store/admin; never created here) ──
  const store = await Store.findOne({ status: "approved" }).select("_id name");
  const admin = await User.findOne({
    role: { $in: ["admin", "super_admin"] },
  }).select("_id");
  if (!store) throw new Error("No approved store found — cannot seed demo data.");
  if (!admin) throw new Error("No admin user found — cannot seed demo data.");

  const products = await Product.find({
    deleted: { $ne: true },
    isActive: true,
    "images.0": { $exists: true },
  })
    .select("name nameAr price images store")
    .limit(40)
    .lean();
  if (products.length < 5) {
    throw new Error(`Need >=5 products with images, found ${products.length}.`);
  }
  console.log(`🔗 Anchoring to store "${store.name}", ${products.length} products`);

  // ── Demo customers + addresses ──
  const users = [];
  const addresses = [];
  for (let i = 0; i < DEMO_CUSTOMERS.length; i++) {
    const c = DEMO_CUSTOMERS[i];
    const slug = c.name.toLowerCase().replace(/\s+/g, ".");
    const phone = "+2010" + (12345670 + i); // valid +201XXXXXXXXX
    const user = await User.create({
      name: c.name,
      email: `${slug}${DEMO.userDomain}`,
      password: "Demo@12345",
      phoneNumber: phone,
      role: "customer",
      active: true,
      isVerified: true,
      lang: "ar",
    });
    const addr = await Address.create({
      user: user._id,
      name: c.name,
      phone,
      address: c.address,
      city: c.city,
      state: c.city,
      isDefault: true,
      type: "Shipping",
    });
    users.push(user);
    addresses.push(addr);
  }
  console.log(`👥 Created ${users.length} demo customers + addresses`);

  // ── Demo orders (spread across the last ~6 days for live-feeling toasts) ──
  let orderCount = 0;
  for (let i = 0; i < ORDER_STATUSES.length; i++) {
    const user = users[i % users.length];
    const addr = addresses[i % addresses.length];
    const status = ORDER_STATUSES[i];

    // 1–2 distinct products per order.
    const p1 = products[i % products.length];
    const items = [
      { product: p1, qty: 1 + (i % 2) },
    ];
    if (i % 3 === 0) {
      const p2 = products[(i + 7) % products.length];
      if (p2._id.toString() !== p1._id.toString()) {
        items.push({ product: p2, qty: 1 });
      }
    }

    const orderItems = items.map((it) => ({
      product: it.product._id,
      quantity: it.qty,
      price: it.product.price,
    }));
    const itemsPrice = round2(
      items.reduce((s, it) => s + it.product.price * it.qty, 0)
    );
    const shippingPrice = itemsPrice >= 5000 ? 0 : 60;
    const totalPrice = round2(itemsPrice + shippingPrice);

    const isDelivered = status === "delivered";
    const isPaid = isDelivered || status === "out_for_delivery" || status === "shipped";

    // Backdate: most recent first so they top the social-proof feed.
    const hoursAgo = i * 8 + (i % 5);
    const when = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    const timeline = [{ status: "confirmed", note: "Order confirmed", updatedBy: admin._id }];
    if (isPaid) timeline.push({ status: "shipped", note: "Handed to courier", updatedBy: admin._id });
    if (isDelivered) timeline.push({ status: "delivered", note: "Delivered", updatedBy: admin._id });

    const order = await Order.create({
      user: user._id,
      orderItems,
      shippingAddress: addr._id,
      paymentMethod: i % 4 === 0 ? "paymob" : "cod",
      store: store._id,
      itemsPrice,
      shippingPrice,
      totalPrice,
      isPaid,
      paidAt: isPaid ? when : undefined,
      isDelivered,
      deliveredAt: isDelivered ? when : undefined,
      status,
      statusTimeline: timeline,
      notes: DEMO.orderNote,
    });

    // Mongoose timestamps override createdAt on insert, so backdate it after
    // via the native driver (bypasses the timestamps plugin entirely).
    await Order.collection.updateOne(
      { _id: order._id },
      { $set: { createdAt: when, updatedAt: when } }
    );
    orderCount++;
  }
  console.log(`🧾 Created ${orderCount} demo orders`);

  // ── Public collectible coupons (skip any code already taken by a real one) ──
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const couponDefs = [
    { code: "WELCOME10", discountType: "percentage", discountValue: 10, minimumPurchase: 0, description: "خصم ترحيبي ١٠٪ على أول طلب — 10% off your first order" },
    { code: "FLASH15", discountType: "percentage", discountValue: 15, minimumPurchase: 3000, maximumDiscount: 2000, description: "عرض فلاش ١٥٪ — Flash deal 15% off" },
    { code: "SAVE100", discountType: "fixed", discountValue: 100, minimumPurchase: 2000, description: "وفّر ١٠٠ ج.م — Save EGP 100" },
    { code: "BULK20", discountType: "percentage", discountValue: 20, minimumPurchase: 10000, maximumDiscount: 3000, description: "خصم الجملة ٢٠٪ — Bulk order 20% off" },
  ];
  let couponCount = 0;
  for (const def of couponDefs) {
    const exists = await Coupon.findOne({ code: def.code }).select("_id");
    if (exists) {
      console.log(`   ↪ coupon ${def.code} already exists, skipping`);
      continue;
    }
    await Coupon.create({
      ...def,
      startDate: start,
      endDate: end,
      usageLimit: 1000,
      isActive: true,
      isPublic: true,
      store: store._id,
      createdBy: admin._id,
    });
    couponCount++;
  }
  console.log(`🎟️  Created ${couponCount} public coupons`);

  // ── Advertisements (marker lives in `description`, never rendered) ──
  const img = (i) => products[i % products.length].images[0].url;
  const adDefs = [
    {
      title: "Free shipping over EGP 5,000 + up to 50% OFF",
      titleAr: "شحن مجاني للطلبات فوق ٥٠٠٠ ج.م + خصومات تصل إلى ٥٠٪",
      position: "announcement",
      link: "/deals",
      sortOrder: 0,
    },
    {
      title: "Mega Tech Sale",
      titleAr: "تخفيضات التكنولوجيا الكبرى",
      subtitle: "Up to 50% off networking gear — limited time",
      subtitleAr: "خصم حتى ٥٠٪ على معدات الشبكات لفترة محدودة",
      position: "hero",
      image: img(0),
      link: "/deals",
      sortOrder: 0,
    },
    {
      title: "Networking Deals",
      titleAr: "عروض الشبكات",
      subtitle: "Routers, switches & access points",
      subtitleAr: "راوترات وسويتشات ونقاط وصول",
      position: "category-strip",
      image: img(3),
      link: "/deals",
      sortOrder: 0,
    },
    {
      title: "Best Sellers",
      titleAr: "الأكثر مبيعًا",
      subtitle: "Shop top-rated picks",
      subtitleAr: "تسوّق الأعلى تقييمًا",
      position: "sidebar",
      image: img(6),
      link: "/products",
      sortOrder: 0,
    },
    {
      title: "Bundle & Save",
      titleAr: "اشترِ معًا ووفّر",
      subtitle: "Buy together and save more",
      subtitleAr: "اشترِ المنتجات معًا ووفّر أكثر",
      position: "pdp",
      image: img(9),
      link: "/deals",
      sortOrder: 0,
    },
    {
      title: "Welcome — 10% off",
      titleAr: "أهلاً بك — خصم ١٠٪",
      subtitle: "Use code WELCOME10 at checkout",
      subtitleAr: "استخدم كود WELCOME10 عند الدفع",
      position: "popup",
      image: img(12),
      link: "/deals",
      sortOrder: 0,
    },
  ];
  for (const def of adDefs) {
    await Advertisement.create({
      ...def,
      description: `${DEMO.adMarker} seeded demo ad — safe to delete`,
      isActive: true,
      startDate: start,
      endDate: end,
    });
  }
  console.log(`📣 Created ${adDefs.length} advertisements`);

  // ── Newsletter subscribers ──
  const sources = ["newsletter", "exit-intent", "popup", "checkout"];
  let subCount = 0;
  for (let i = 0; i < users.length; i++) {
    await Subscriber.create({
      email: users[i].email,
      source: sources[i % sources.length],
    });
    subCount++;
  }
  console.log(`📧 Created ${subCount} subscribers`);

  console.log("\n✨ Demo seed complete.");
  await mongoose.disconnect();
}

// Only run when invoked directly (so cleanup can import wipeDemo safely).
if (process.argv[1] === __filename) {
  seed().catch(async (err) => {
    console.error("❌ Demo seed failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  });
}
