/**
 * One-time backfill: populate Category.nameAr for known seeded categories.
 * Idempotent — only writes when nameAr is missing or empty. Run with:
 *
 *   node scripts/backfill-category-nameAr.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import Category from "../models/category.model.js";

const TRANSLATIONS = {
  "3G/4G Wireless Router": "راوتر لاسلكي 3G/4G",
  "AV600/AV1000 Powerline Adapter": "محوّل باورلاين AV600/AV1000",
  "Bluetooth USB Adapter": "محوّل بلوتوث USB",
  "Business Laptops": "لاب توب للأعمال",
  "Camera Lenses": "عدسات الكاميرا",
  "Cameras & Photography": "الكاميرات والتصوير",
  "Computer Components": "مكوّنات الكمبيوتر",
  "DSLR Cameras": "كاميرات DSLR",
  "DVR/NVR": "DVR/NVR",
  "Desktop AP": "نقطة وصول مكتبية",
  "Gaming Laptops": "لاب توب للألعاب",
  "Graphics Cards": "كروت الشاشة",
  "Keyboards & Mice": "لوحات المفاتيح والفئران",
  "LTE/5G Gateway": "بوابة LTE/5G",
  "Laptops & Computers": "لاب توب وكمبيوتر",
  "Mesh System with BBA": "شبكة Mesh مع BBA",
  "Mirrorless Cameras": "كاميرات بدون مرآة",
  "Mobile Wi-Fi": "واي فاي محمول",
  "Monitors": "الشاشات",
  "Network Camera": "كاميرا الشبكة",
  "Network Switches": "سويتشات الشبكة",
  "Networking": "الشبكات",
  "Networking & IT": "الشبكات وتقنية المعلومات",
  "PCI-E Adapter": "محوّل PCI-E",
  "Peripherals & Accessories": "الملحقات والإكسسوارات",
  "Portable Router": "راوتر محمول",
  "Processors": "المعالجات",
  "Routers & Access Points": "راوترات ونقاط وصول",
  "Security & Surveillance": "الأمن والمراقبة",
  "Server Racks": "خزائن السيرفرات",
  "Storage & SSDs": "التخزين وأقراص SSD",
  "Turbo HD Camera": "كاميرا Turbo HD",
  "USB Hub": "موزّع USB",
  "USB Type-C Hub": "موزّع USB Type-C",
  "USB to Ethernet Adapter": "محوّل USB إلى إيثرنت",
  "Unmanaged 5/8/16/24/48P - 10/100/1000 Switches": "سويتشات غير مُدارة 5/8/16/24/48 منفذ - 10/100/1000",
  "Unmanaged/Easy Smart PoE Switch": "سويتش PoE غير مُدار / Easy Smart",
  "Video Intercom": "إنتركوم بالفيديو",
  "Wi-Fi 4 Range Extender": "مقوّي إشارة Wi-Fi 4",
  "Wi-Fi 4 Router": "راوتر Wi-Fi 4",
  "Wi-Fi 4 USB Adapter": "محوّل USB لـ Wi-Fi 4",
  "Wi-Fi 5 Mesh System": "شبكة Mesh لـ Wi-Fi 5",
  "Wi-Fi 5 Range Extender": "مقوّي إشارة Wi-Fi 5",
  "Wi-Fi 5 Router": "راوتر Wi-Fi 5",
  "Wi-Fi 5 USB Adapter": "محوّل USB لـ Wi-Fi 5",
  "Wi-Fi 6 Mesh System": "شبكة Mesh لـ Wi-Fi 6",
  "Wi-Fi 6 Range Extender": "مقوّي إشارة Wi-Fi 6",
  "Wi-Fi 6 Router": "راوتر Wi-Fi 6",
  "Wi-Fi 6 USB Adapter": "محوّل USB لـ Wi-Fi 6",
  "xDSL Modem Router": "راوتر مودم xDSL",
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing in .env");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let updated = 0;
  let skipped = 0;
  let unmapped = [];

  const cats = await Category.find({}).lean();
  for (const cat of cats) {
    if (cat.nameAr && cat.nameAr.trim()) {
      skipped++;
      continue;
    }
    const ar = TRANSLATIONS[cat.name];
    if (!ar) {
      unmapped.push(cat.name);
      continue;
    }
    await Category.updateOne({ _id: cat._id }, { $set: { nameAr: ar } });
    updated++;
    console.log(`  ✓ ${cat.name}  →  ${ar}`);
  }

  console.log(`\nUpdated: ${updated}`);
  console.log(`Already had nameAr: ${skipped}`);
  if (unmapped.length) {
    console.log(`\nUnmapped (need translations added to TRANSLATIONS):`);
    unmapped.forEach((n) => console.log(`  - ${n}`));
  }
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
