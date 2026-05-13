/**
 * Backfill Collection.nameAr and descriptionAr for seeded bundles.
 * Idempotent — only writes when the AR field is missing/empty.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Collection from "../models/collection.model.js";

const TRANSLATIONS = {
  "Security Starter Kit": {
    nameAr: "حزمة بداية للأمن والمراقبة",
    descriptionAr:
      "ابدأ بمراقبة منزلك أو مكتبك — كاميرات مع DVR/NVR وكل ما يلزم للتركيب السريع.",
  },
  "Home Mesh Upgrade": {
    nameAr: "ترقية شبكة المنزل Mesh",
    descriptionAr:
      "تخلّص من نقاط ضعف الواي فاي — حزمة Deco X20 من 3 قطع تغطي كامل المنزل.",
  },
  "Small Office Network": {
    nameAr: "شبكة المكتب الصغير",
    descriptionAr:
      "كل ما يحتاجه المكتب الصغير للبقاء متصلًا — راوتر وسويتش ونقاط وصول.",
  },
  "Pro Network Bundle": {
    nameAr: "حزمة الشبكة الاحترافية",
    descriptionAr:
      "استعد للمستقبل بحزمة معدات TP-Link الاحترافية لشبكات الشركات.",
  },
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let updated = 0;
  const unmapped = [];
  const cols = await Collection.find({}).lean();
  for (const col of cols) {
    const ar = TRANSLATIONS[col.name];
    if (!ar) {
      if (!col.nameAr) unmapped.push(col.name);
      continue;
    }
    const set = {};
    if (!col.nameAr) set.nameAr = ar.nameAr;
    if (!col.descriptionAr) set.descriptionAr = ar.descriptionAr;
    if (Object.keys(set).length === 0) continue;
    await Collection.updateOne({ _id: col._id }, { $set: set });
    updated++;
    console.log(`  ✓ ${col.name}  →  ${ar.nameAr}`);
  }

  console.log(`\nUpdated: ${updated}`);
  if (unmapped.length) {
    console.log("Unmapped:");
    unmapped.forEach((n) => console.log(`  - ${n}`));
  }
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
