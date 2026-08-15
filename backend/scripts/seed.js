import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import Store from "../models/store.model.js";
import Product from "../models/product.model.js";
import Coupon from "../models/coupon.model.js";
import Advertisement from "../models/advertisement.model.js";
import Collection from "../models/collection.model.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/belgomla";

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // ── Wipe ──
  await Promise.all([
    User.deleteMany({}), Category.deleteMany({}), Brand.deleteMany({}),
    Store.deleteMany({}), Product.deleteMany({}), Coupon.deleteMany({}),
    Advertisement.deleteMany({}), Collection.deleteMany({}),
  ]);
  console.log("🗑️  Cleared all collections");

  // ── Users ──
  // Field names must match user.model.js exactly. They previously didn't:
  // `firstName`/`lastName`, `phone` and `verified` are not schema paths, and
  // Mongoose's default strict mode drops unknown keys without complaining. So
  // every seeded user landed with no name, no phone, and — because the real
  // field is `isVerified`, which defaults to false — a login that was refused
  // with EMAIL_NOT_VERIFIED. Phone numbers are stored E.164, which is what the
  // schema validator requires.
  const [admin, storeOwner, customer] = await User.create([
    { name: "Admin Belgomla", email: "admin@belgomla.com", password: "Admin@123", phoneNumber: "+201009353639", role: "super_admin", active: true, isVerified: true },
    { name: "Ahmed Hassan", email: "store@belgomla.com", password: "Store@123", phoneNumber: "+201112223344", role: "store", active: true, isVerified: true },
    { name: "Mohamed Ali", email: "customer@belgomla.com", password: "Customer@123", phoneNumber: "+201223344556", role: "customer", active: true, isVerified: true },
  ]);
  console.log("👤 Created 3 users");

  // ── Categories ──
  const parents = await Category.create([
    { name: "Laptops & Computers", nameAr: "لابتوبات وكمبيوترات", image: "https://img.icons8.com/color/96/laptop.png" },
    { name: "Cameras & Photography", nameAr: "كاميرات وتصوير", image: "https://img.icons8.com/color/96/camera.png" },
    { name: "Networking & IT", nameAr: "شبكات وتكنولوجيا المعلومات", image: "https://img.icons8.com/color/96/wi-fi-connected.png" },
    { name: "Computer Components", nameAr: "مكونات الكمبيوتر", image: "https://img.icons8.com/color/96/processor.png" },
    { name: "Peripherals & Accessories", nameAr: "ملحقات واكسسوارات", image: "https://img.icons8.com/color/96/keyboard.png" },
  ]);

  const subs = await Category.create([
    { name: "Gaming Laptops", nameAr: "لابتوبات جيمنج", parentCategory: parents[0]._id, image: "https://img.icons8.com/color/96/laptop.png" },
    { name: "Business Laptops", nameAr: "لابتوبات أعمال", parentCategory: parents[0]._id, image: "https://img.icons8.com/color/96/workstation.png" },
    { name: "DSLR Cameras", nameAr: "كاميرات DSLR", parentCategory: parents[1]._id, image: "https://img.icons8.com/color/96/compact-camera.png" },
    { name: "Mirrorless Cameras", nameAr: "كاميرات ميرورليس", parentCategory: parents[1]._id, image: "https://img.icons8.com/color/96/camera.png" },
    { name: "Camera Lenses", nameAr: "عدسات كاميرات", parentCategory: parents[1]._id, image: "https://img.icons8.com/color/96/aperture.png" },
    { name: "Routers & Access Points", nameAr: "راوترات ونقاط وصول", parentCategory: parents[2]._id, image: "https://img.icons8.com/color/96/router.png" },
    { name: "Network Switches", nameAr: "سويتشات شبكات", parentCategory: parents[2]._id, image: "https://img.icons8.com/color/96/ethernet-on.png" },
    { name: "Graphics Cards", nameAr: "كروت شاشة", parentCategory: parents[3]._id, image: "https://img.icons8.com/color/96/video-card.png" },
    { name: "Processors", nameAr: "معالجات", parentCategory: parents[3]._id, image: "https://img.icons8.com/color/96/processor.png" },
    { name: "Storage & SSDs", nameAr: "تخزين و SSD", parentCategory: parents[3]._id, image: "https://img.icons8.com/color/96/ssd.png" },
    { name: "Monitors", nameAr: "شاشات", parentCategory: parents[4]._id, image: "https://img.icons8.com/color/96/monitor--v1.png" },
    { name: "Keyboards & Mice", nameAr: "لوحات مفاتيح وماوسات", parentCategory: parents[4]._id, image: "https://img.icons8.com/color/96/keyboard.png" },
  ]);

  for (const p of parents) {
    const children = subs.filter(s => s.parentCategory?.toString() === p._id.toString());
    p.subCategories = children.map(c => c._id);
    await p.save();
  }
  console.log("📁 Created 5 parent + 12 sub categories");

  // ── Brands ──
  const brands = await Brand.create([
    { name: "Apple", logo: "https://cdn.simpleicons.org/apple/000000" },
    { name: "Dell", logo: "https://cdn.simpleicons.org/dell/007DB8" },
    { name: "HP", logo: "https://cdn.simpleicons.org/hp/0096D6" },
    { name: "Lenovo", logo: "https://cdn.simpleicons.org/lenovo/E2231A" },
    { name: "ASUS", logo: "https://cdn.simpleicons.org/asus/000000" },
    // Simple Icons no longer serves Canon or Logitech, so seeding their old
    // slugs only bought a 404 per page load. They seed without a logo and the
    // storefront shows the name instead, until a real one is uploaded.
    { name: "Canon", logo: "" },
    { name: "Sony", logo: "https://cdn.simpleicons.org/sony/000000" },
    { name: "Nikon", logo: "https://cdn.simpleicons.org/nikon/FFE100" },
    { name: "TP-Link", logo: "https://cdn.simpleicons.org/tplink/4ACBD6" },
    { name: "Logitech", logo: "" },
    { name: "Samsung", logo: "https://cdn.simpleicons.org/samsung/1428A0" },
    { name: "MSI", logo: "https://cdn.simpleicons.org/msi/FF0000" },
    { name: "NVIDIA", logo: "https://cdn.simpleicons.org/nvidia/76B900" },
    { name: "AMD", logo: "https://cdn.simpleicons.org/amd/ED1C24" },
    { name: "Corsair", logo: "https://cdn.simpleicons.org/corsair/000000" },
  ]);
  const b = Object.fromEntries(brands.map(br => [br.name, br]));
  console.log("🏷️  Created 15 brands");

  // ── Store ──
  const store = await Store.create({
    name: "Belgomla Tech", owner: storeOwner._id, status: "approved",
    email: "store@belgomla.com", phone: "01112223344", description: "IT & Camera equipment distributor",
    businessName: "Belgomla Tech", businessType: "company", businessDescription: "Wholesale IT & Camera equipment distributor in Egypt",
    legalEntityType: "egyptian_tax_authority", licenseNumber: "LIC-2025-TECH-001",
    companyName: "Belgomla Tech LLC", companyAddress: "15 شارع التحرير، وسط البلد، القاهرة",
    issueDate: new Date("2024-01-01"), expiryDate: new Date("2027-01-01"),
    contactPersonName: "Ahmed Hassan",
    address: "15 شارع التحرير، وسط البلد", city: "القاهرة", governorate: "القاهرة", postalCode: "11511",
    productCategories: ["Laptops", "Cameras", "Networking", "Components", "Peripherals"],
  });
  console.log("🏪 Created store: Belgomla Tech");

  // ── Helper ──
  const img = (label, color = "#1a1a2e") => [{ url: `https://placehold.co/600x600/${color.replace("#","")}/white?text=${encodeURIComponent(label)}&font=inter`, alt: label }];

  // ── Products ──
  const products = await Product.create([
    // === Laptops ===
    { name: "MacBook Pro 14\" M3 Pro", nameAr: "ماك بوك برو 14 بوصة M3 Pro", description: "Apple MacBook Pro with M3 Pro chip, 18GB RAM, 512GB SSD, Liquid Retina XDR display", descriptionAr: "ماك بوك برو بمعالج M3 Pro وذاكرة 18 جيجا و512 جيجا SSD", price: 89999, stock: 15, category: subs[1]._id, brand: b.Apple._id, store: store._id, images: img("MacBook+Pro+14", "2d2d2d"), rating: 4.8, numReviews: 124, tags: ["laptop","apple","macbook","pro"], approvalStatus: "approved", isActive: true, featured: true, bulkPricing: [{ minQty: 3, unitPrice: 86999 }, { minQty: 5, unitPrice: 84999 }] },
    { name: "Dell XPS 15 (2025)", nameAr: "ديل XPS 15 (2025)", description: "Intel Core Ultra 7, 16GB RAM, 512GB SSD, 15.6\" OLED 3.5K touch display", descriptionAr: "ديل XPS 15 بمعالج انتل كور الترا 7 وشاشة OLED", price: 62999, stock: 22, category: subs[1]._id, brand: b.Dell._id, store: store._id, images: img("Dell+XPS+15", "0057a8"), rating: 4.6, numReviews: 87, tags: ["laptop","dell","xps","oled"], approvalStatus: "approved", isActive: true, bulkPricing: [{ minQty: 3, unitPrice: 60999 }] },
    { name: "ASUS ROG Strix G16", nameAr: "أسوس ROG Strix G16", description: "Intel i9-14900HX, RTX 4070, 16GB DDR5, 1TB SSD, 16\" QHD+ 240Hz gaming laptop", descriptionAr: "لابتوب جيمنج أسوس ROG بمعالج i9 وكارت RTX 4070", price: 74999, stock: 10, category: subs[0]._id, brand: b.ASUS._id, store: store._id, images: img("ROG+Strix+G16", "cc0000"), rating: 4.7, numReviews: 56, tags: ["gaming","laptop","asus","rog"], approvalStatus: "approved", isActive: true, featured: true, saleActive: true, salePrice: 69999, salePercentage: 7, bulkPricing: [{ minQty: 2, unitPrice: 68999 }] },
    { name: "Lenovo ThinkPad X1 Carbon Gen 12", nameAr: "لينوفو ثينك باد X1 كاربون الجيل 12", description: "Intel Core Ultra 7, 32GB RAM, 1TB SSD, 14\" WUXGA IPS, fingerprint reader", descriptionAr: "لابتوب أعمال لينوفو ثينك باد بمعالج الترا 7 وذاكرة 32 جيجا", price: 72999, stock: 18, category: subs[1]._id, brand: b.Lenovo._id, store: store._id, images: img("ThinkPad+X1", "1a1a1a"), rating: 4.5, numReviews: 93, tags: ["laptop","lenovo","thinkpad","business"], approvalStatus: "approved", isActive: true },

    // === Cameras ===
    { name: "Canon EOS R6 Mark II", nameAr: "كانون EOS R6 مارك II", description: "24.2MP Full-Frame mirrorless, 4K 60fps, Dual Pixel CMOS AF II, in-body stabilization", descriptionAr: "كاميرا كانون ميرورليس فول فريم 24.2 ميجابيكسل", price: 115000, stock: 8, category: subs[3]._id, brand: b.Canon._id, store: store._id, images: img("Canon+EOS+R6+II", "b8000b"), rating: 4.9, numReviews: 67, tags: ["camera","canon","mirrorless","fullframe"], approvalStatus: "approved", isActive: true, featured: true, bulkPricing: [{ minQty: 2, unitPrice: 112000 }] },
    { name: "Sony Alpha A7 IV", nameAr: "سوني ألفا A7 IV", description: "33MP Full-Frame, 4K 60p, Real-time Eye AF, 10fps burst, 5-axis IBIS", descriptionAr: "كاميرا سوني ألفا فول فريم 33 ميجابيكسل", price: 105000, stock: 6, category: subs[3]._id, brand: b.Sony._id, store: store._id, images: img("Sony+A7+IV", "1428a0"), rating: 4.8, numReviews: 89, tags: ["camera","sony","mirrorless","alpha"], approvalStatus: "approved", isActive: true },
    { name: "Nikon Z5 Body", nameAr: "نيكون Z5 بودي", description: "24.3MP Full-Frame, 4K UHD, 5-axis VR, dual SD card slots, compact design", descriptionAr: "كاميرا نيكون Z5 فول فريم 24.3 ميجابيكسل", price: 55000, stock: 12, category: subs[3]._id, brand: b.Nikon._id, store: store._id, images: img("Nikon+Z5", "ffc800"), rating: 4.5, numReviews: 42, tags: ["camera","nikon","mirrorless","z5"], approvalStatus: "approved", isActive: true, saleActive: true, salePrice: 49999, salePercentage: 9 },
    { name: "Canon RF 50mm f/1.8 STM", nameAr: "كانون RF 50mm f/1.8 STM", description: "Lightweight prime lens, f/1.8 aperture, STM motor for smooth video AF", descriptionAr: "عدسة كانون RF 50mm خفيفة الوزن بفتحة 1.8", price: 12500, stock: 30, category: subs[4]._id, brand: b.Canon._id, store: store._id, images: img("Canon+RF+50mm", "333333"), rating: 4.7, numReviews: 112, tags: ["lens","canon","rf","prime"], approvalStatus: "approved", isActive: true },

    // === Networking ===
    { name: "TP-Link Archer AX6000", nameAr: "تي بي لينك Archer AX6000", description: "Wi-Fi 6 dual-band router, 6000Mbps, 8 antennas, 2.5G WAN port, MU-MIMO", descriptionAr: "راوتر واي فاي 6 ثنائي النطاق بسرعة 6000 ميجابت", price: 8500, stock: 40, category: subs[5]._id, brand: b["TP-Link"]._id, store: store._id, images: img("TP-Link+AX6000", "00a1e4"), rating: 4.4, numReviews: 158, tags: ["router","wifi6","tplink","networking"], approvalStatus: "approved", isActive: true, bulkPricing: [{ minQty: 5, unitPrice: 7800 }, { minQty: 10, unitPrice: 7200 }] },
    { name: "TP-Link TL-SG1024D 24-Port Switch", nameAr: "تي بي لينك سويتش 24 بورت", description: "24-port Gigabit desktop/rackmount switch, plug-and-play, metal housing", descriptionAr: "سويتش 24 بورت جيجابت للشبكات", price: 4200, stock: 50, category: subs[6]._id, brand: b["TP-Link"]._id, store: store._id, images: img("24-Port+Switch", "2d5f8a"), rating: 4.3, numReviews: 76, tags: ["switch","networking","gigabit","tplink"], approvalStatus: "approved", isActive: true, bulkPricing: [{ minQty: 5, unitPrice: 3800 }] },

    // === Components ===
    { name: "NVIDIA GeForce RTX 4070 Ti Super", nameAr: "إنفيديا RTX 4070 Ti سوبر", description: "16GB GDDR6X, Ada Lovelace architecture, DLSS 3, ray tracing, 285W TDP", descriptionAr: "كارت شاشة إنفيديا RTX 4070 Ti سوبر 16 جيجا", price: 48000, stock: 7, category: subs[7]._id, brand: b.NVIDIA._id, store: store._id, images: img("RTX+4070+Ti", "76b900"), rating: 4.9, numReviews: 203, tags: ["gpu","nvidia","rtx","gaming"], approvalStatus: "approved", isActive: true, featured: true },
    { name: "AMD Ryzen 9 7950X", nameAr: "AMD رايزن 9 7950X", description: "16-core 32-thread processor, 5.7GHz boost, AM5 socket, 170W TDP", descriptionAr: "معالج AMD رايزن 9 بـ 16 نواة و32 خيط", price: 28000, stock: 14, category: subs[8]._id, brand: b.AMD._id, store: store._id, images: img("Ryzen+9+7950X", "ed1c24"), rating: 4.8, numReviews: 167, tags: ["cpu","amd","ryzen","processor"], approvalStatus: "approved", isActive: true },
    { name: "Samsung 990 Pro 2TB NVMe SSD", nameAr: "سامسونج 990 برو 2 تيرا NVMe", description: "PCIe 4.0 NVMe M.2, 7450MB/s read, 6900MB/s write, V-NAND", descriptionAr: "هارد SSD سامسونج 990 برو 2 تيرا بسرعة قراءة 7450", price: 11500, stock: 35, category: subs[9]._id, brand: b.Samsung._id, store: store._id, images: img("990+Pro+2TB", "1428a0"), rating: 4.7, numReviews: 234, tags: ["ssd","samsung","nvme","storage"], approvalStatus: "approved", isActive: true, saleActive: true, salePrice: 9999, salePercentage: 13 },
    { name: "Corsair Vengeance DDR5 32GB (2x16GB)", nameAr: "كورسير DDR5 32 جيجا", description: "DDR5-6000MHz, CL36, Intel XMP 3.0 ready, black heatspreader", descriptionAr: "رامات كورسير DDR5 بسرعة 6000 ميجاهيرتز 32 جيجا", price: 7500, stock: 45, category: subs[7]._id, brand: b.Corsair._id, store: store._id, images: img("DDR5+32GB", "444444"), rating: 4.6, numReviews: 145, tags: ["ram","ddr5","corsair","memory"], approvalStatus: "approved", isActive: true },

    // === Peripherals ===
    { name: "LG UltraGear 27\" 4K 144Hz", nameAr: "إل جي ألترا جير 27 بوصة 4K", description: "27\" Nano IPS, 4K UHD, 144Hz, 1ms GtG, HDR600, USB-C, gaming monitor", descriptionAr: "شاشة جيمنج إل جي 27 بوصة 4K بمعدل تحديث 144", price: 22000, stock: 16, category: subs[10]._id, brand: b.Samsung._id, store: store._id, images: img("LG+4K+27+Monitor", "a50034"), rating: 4.6, numReviews: 89, tags: ["monitor","4k","gaming","lg"], approvalStatus: "approved", isActive: true },
    { name: "Logitech MX Master 3S", nameAr: "لوجيتك MX Master 3S", description: "Wireless mouse, 8K DPI, quiet clicks, MagSpeed scroll, USB-C, multi-device", descriptionAr: "ماوس لاسلكي لوجيتك MX Master 3S بدقة 8000", price: 4800, stock: 55, category: subs[11]._id, brand: b.Logitech._id, store: store._id, images: img("MX+Master+3S", "00b956"), rating: 4.7, numReviews: 312, tags: ["mouse","logitech","wireless","productivity"], approvalStatus: "approved", isActive: true, bulkPricing: [{ minQty: 5, unitPrice: 4400 }] },
    { name: "Corsair K70 RGB Pro", nameAr: "كورسير K70 RGB Pro", description: "Mechanical gaming keyboard, Cherry MX Red, per-key RGB, aluminum frame", descriptionAr: "كيبورد ميكانيكي كورسير K70 بإضاءة RGB", price: 6500, stock: 28, category: subs[11]._id, brand: b.Corsair._id, store: store._id, images: img("Corsair+K70", "1a1a1a"), rating: 4.5, numReviews: 198, tags: ["keyboard","mechanical","corsair","gaming"], approvalStatus: "approved", isActive: true },
    { name: "MSI MAG 274UPF 4K Monitor", nameAr: "MSI MAG 274UPF شاشة 4K", description: "27\" Rapid IPS, 4K, 144Hz, 1ms GTG, HDR 400, Type-C, KVM switch", descriptionAr: "شاشة MSI 4K جيمنج 27 بوصة بمعدل 144 هيرتز", price: 19500, stock: 11, category: subs[10]._id, brand: b.MSI._id, store: store._id, images: img("MSI+4K+Monitor", "ff0000"), rating: 4.4, numReviews: 67, tags: ["monitor","4k","msi","gaming"], approvalStatus: "approved", isActive: true, saleActive: true, salePrice: 17500, salePercentage: 10 },
  ]);
  console.log(`📦 Created ${products.length} products`);

  // ── Coupons ──
  await Coupon.create([
    { code: "TECHLAUNCH", discountType: "percentage", discountValue: 15, maxUsage: 200, usedCount: 0, startDate: new Date(), endDate: new Date(Date.now() + 30*24*60*60*1000), isActive: true, minOrderAmount: 5000, store: store._id, createdBy: storeOwner._id },
    { code: "BULK20", discountType: "percentage", discountValue: 20, maxUsage: 50, usedCount: 0, startDate: new Date(), endDate: new Date(Date.now() + 60*24*60*60*1000), isActive: true, minOrderAmount: 20000, store: store._id, createdBy: storeOwner._id },
  ]);
  console.log("🎟️  Created 2 coupons");

  // ── Advertisements ──
  await Advertisement.create([
    { title: "Summer Tech Sale", titleAr: "تخفيضات صيف التكنولوجيا", subtitle: "Up to 25% off on laptops & cameras", subtitleAr: "خصم يصل إلى 25% على اللابتوبات والكاميرات", image: "https://placehold.co/1200x400/1a1a2e/00d4ff?text=Summer+Tech+Sale+25%25+Off&font=inter", position: "hero", isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 30*24*60*60*1000), backgroundColor: "#1a1a2e", textColor: "#00d4ff" },
    { title: "Bulk Discounts", titleAr: "خصومات الجملة", subtitle: "Save more when you buy in bulk — special IT pricing", subtitleAr: "وفّر أكثر عند الشراء بالجملة — أسعار خاصة لمعدات IT", image: "https://placehold.co/1200x400/0a192f/3b82f6?text=Bulk+IT+Discounts&font=inter", position: "banner", isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 60*24*60*60*1000), backgroundColor: "#0a192f", textColor: "#3b82f6" },
  ]);
  console.log("📢 Created 2 advertisements");

  // ── Collections (Bundles) ──
  const p = Object.fromEntries(products.map(pr => [pr.name, pr]));
  await Collection.create([
    {
      name: "Creator Studio Bundle",
      description: "Everything a content creator needs — professional mirrorless camera paired with a versatile prime lens. Perfect for photography, videography, and streaming setups.",
      store: store._id,
      items: [
        { product: p["Canon EOS R6 Mark II"]._id, quantity: 1 },
        { product: p["Canon RF 50mm f/1.8 STM"]._id, quantity: 1 },
      ],
      bundlePrice: 119000,
      isActive: true,
    },
    {
      name: "Office Productivity Pro",
      description: "The ultimate business workstation combo — premium ultrabook with a precision wireless mouse and a fast NVMe SSD upgrade. Built for professionals who demand performance.",
      store: store._id,
      items: [
        { product: p["Lenovo ThinkPad X1 Carbon Gen 12"]._id, quantity: 1 },
        { product: p["Logitech MX Master 3S"]._id, quantity: 1 },
        { product: p["Samsung 990 Pro 2TB NVMe SSD"]._id, quantity: 1 },
      ],
      bundlePrice: 82000,
      isActive: true,
    },
    {
      name: "Gaming Beast Setup",
      description: "Dominate with this ultimate gaming rig — a powerhouse gaming laptop, a top-tier graphics card for your desktop, and a buttery-smooth 4K 144Hz monitor. No compromises.",
      store: store._id,
      items: [
        { product: p["ASUS ROG Strix G16"]._id, quantity: 1 },
        { product: p["NVIDIA GeForce RTX 4070 Ti Super"]._id, quantity: 1 },
        { product: p["LG UltraGear 27\" 4K 144Hz"]._id, quantity: 1 },
      ],
      bundlePrice: 135000,
      isActive: true,
    },
    {
      name: "Smart Network Setup",
      description: "Upgrade your office or home network infrastructure — enterprise-grade Wi-Fi 6 router with a reliable 24-port gigabit switch for seamless connectivity.",
      store: store._id,
      items: [
        { product: p["TP-Link Archer AX6000"]._id, quantity: 1 },
        { product: p["TP-Link TL-SG1024D 24-Port Switch"]._id, quantity: 1 },
      ],
      bundlePrice: 11500,
      isActive: true,
    },
  ]);
  console.log("📦 Created 4 collections/bundles");

  console.log("\n🎉 Seed complete!");
  console.log("   Admin:    admin@belgomla.com / Admin@123");
  console.log("   Store:    store@belgomla.com / Store@123");
  console.log("   Customer: customer@belgomla.com / Customer@123");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); });
