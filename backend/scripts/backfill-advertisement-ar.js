/**
 * Backfill Advertisement.titleAr, subtitleAr, descriptionAr for seeded ads.
 * Idempotent — only writes when the AR field is missing.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Advertisement from "../models/advertisement.model.js";

const TRANSLATIONS = {
  "Summer Tech Sale": {
    titleAr: "تخفيضات الصيف التقنية",
    subtitleAr: "حتى 25% خصم على اللاب توب والكاميرات",
  },
  "Bulk Discounts": {
    titleAr: "خصومات الجملة",
    subtitleAr: "وفّر أكثر عند الشراء بالجملة — أسعار خاصة لتقنية المعلومات",
  },
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");

  let updated = 0;
  const ads = await Advertisement.find({}).lean();
  for (const ad of ads) {
    const tr = TRANSLATIONS[ad.title];
    if (!tr) continue;
    const set = {};
    if (!ad.titleAr && tr.titleAr) set.titleAr = tr.titleAr;
    if (!ad.subtitleAr && tr.subtitleAr) set.subtitleAr = tr.subtitleAr;
    if (Object.keys(set).length === 0) continue;
    await Advertisement.updateOne({ _id: ad._id }, { $set: set });
    console.log(`  ✓ ${ad.title}  →  ${tr.titleAr}`);
    updated++;
  }
  console.log(`\nUpdated: ${updated}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
