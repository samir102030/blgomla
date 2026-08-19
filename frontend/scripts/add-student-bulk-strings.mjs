/**
 * Copy for the section's bulk loading and its catalogue tables. Same line-wise
 * append as the rest; re-running is safe.
 */
import { readFile, writeFile } from "node:fs/promises";

const STRINGS = {
  // ── Bulk panel ──
  "Bulk upload": "رفع جماعي",
  "Bulk upload departments": "رفع أقسام جماعي",
  "Bulk upload products": "رفع منتجات جماعي",
  "Fill the template and load the whole tree at once. A row can name a parent defined anywhere in the sheet, above or below it.":
    "املا القالب وحمّل الشجرة كلها مرة واحدة. أي صف ينفع يسمّي قسم أب موجود في أي مكان في الشيت، فوقه أو تحته.",
  "Fill the template and load a whole shelf at once. A row can name a department that does not exist yet — it will be created.":
    "املا القالب وحمّل الرف كله مرة واحدة. أي صف ينفع يسمّي قسم لسه مش موجود — هيتعمل لوحده.",
  "Download template": "نزّل القالب",
  "Export current": "صدّر الحالي",
  "Downloading…": "جاري التنزيل…",
  "Could not download the file.": "مقدرناش ننزّل الملف.",
  "The upload failed.": "الرفع فشل.",
  Preview: "معاينة",
  "Checking…": "جاري الفحص…",
  Upload: "رفع",
  Clear: "مسح",
  "Nothing has been saved yet.": "لسه مفيش حاجة اتحفظت.",
  "Saved.": "اتحفظ.",
  "rows read": "صف اتقروا",
  "New departments": "أقسام جديدة",
  New: "جديد",
  Updated: "متحدّث",
  Nested: "متداخل",
  "Still need a price — hidden until you set one": "لسه محتاج سعر — مخفي لحد ما تحطه",
  Problems: "مشاكل",

  // ── Departments page ──
  "The student section's own departments. Products are filed under them.":
    "أقسام القسم الطلابي الخاصة بيه. المنتجات بتتحط تحتها.",
  "Search departments": "ابحث في الأقسام",
  "Expand all": "افتح الكل",
  "Collapse all": "اقفل الكل",
  Slug: "المعرّف",
  Shown: "ظاهر",
  Show: "إظهار",
  Hide: "إخفاء",
  "Top level": "مستوى أول",
  "Add a department under this one": "ضيف قسم تحته",
  Showing: "بيعرض",
  of: "من",
  Image: "الصورة",
  Close: "إغلاق",
  Save: "حفظ",

  // ── Products page ──
  "The section's own products. They exist here and nowhere else on the shop.":
    "منتجات القسم الخاصة بيه. موجودة هنا وبس مش في أي مكان تاني في المتجر.",
  "Add product": "أضف منتج",
  "Out of stock": "خلص من المخزون",
  Unpriced: "من غير سعر",
  Product: "المنتج",
  Tags: "الوسوم",
};

for (const [file, useArabic] of [
  ["src/locales/ar.json", true],
  ["src/locales/en.json", false],
]) {
  const raw = await readFile(file, "utf8");
  const existing = JSON.parse(raw);

  const additions = Object.entries(STRINGS)
    .filter(([key]) => !(key in existing))
    .map(([key, ar]) => `  ${JSON.stringify(key)}: ${JSON.stringify(useArabic ? ar : key)}`);

  if (!additions.length) {
    console.log(`${file}: nothing to add`);
    continue;
  }

  const close = raw.lastIndexOf("}");
  const head = raw.slice(0, close).replace(/,?\s*$/, "");
  const updated = `${head},\n${additions.join(",\n")}\n}\n`;

  JSON.parse(updated); // fail here rather than at runtime
  await writeFile(file, updated, "utf8");
  console.log(`${file}: +${additions.length} keys`);
}
