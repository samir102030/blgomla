/**
 * Copy for the student shop — the shelf on the portal and the dashboard module
 * that fills it. Same line-wise append as the other two; re-running is safe.
 */
import { readFile, writeFile } from "node:fs/promises";

const STRINGS = {
  // ── The shelf, storefront side ──
  "The student shelf": "رفّ الطلاب",
  "What the discount is for": "الخصم على إيه",
  products: "منتج",
  Everything: "الكل",
  "Loading products…": "جاري تحميل المنتجات…",
  "Nothing is on the shelf yet.": "مفيش حاجة على الرف لسه.",
  "Could not load the products.": "مقدرناش نحمّل المنتجات.",

  // ── Dashboard module ──
  "admin.studentOverview": "نظرة عامة",
  "admin.studentProducts": "المنتجات",
  "admin.studentDepartments": "الأقسام",
  "admin.studentOffer": "العرض",
  "admin.studentFaculties": "الكليات",
  "admin.studentMembers": "الأعضاء",

  "A shop inside the shop: its own departments and shelf, drawn from the same catalogue, open to students who prove enrolment with a faculty email.":
    "متجر جوه المتجر: أقسامه ورفّه الخاصين بيه، من نفس الكتالوج، مفتوح للطلاب اللي بيثبتوا قيدهم ببريد الكلية.",
  "Open to applications": "مفتوح للتقديم",
  Closed: "مقفول",
  "No faculty domains are accepting applications — nobody can join.":
    "مفيش نطاقات كليات بتقبل تقديم — محدش يقدر ينضم.",
  "Add a faculty": "ضيف كلية",
  "The programme is closed, so the page shows a notice instead of the form.":
    "البرنامج مقفول، فالصفحة بتعرض إشعار بدل الفورم.",
  "Open the programme": "افتح البرنامج",
  "Close the programme": "اقفل البرنامج",
  "Programme opened.": "تم فتح البرنامج.",
  "Programme closed.": "تم قفل البرنامج.",
  "View the student page": "شوف صفحة الطلاب",
  Maintenance: "الصيانة",
  "Renewals and expiries run nightly on their own. This is the same sweep, on demand.":
    "التجديدات وانتهاء العضويات بتشتغل كل ليلة لوحدها. ده نفس التشغيل، وقت ما تحب.",
  "What the section sells": "القسم بيبيع إيه",
  "Departments bring their whole subtree with them; picked products are added on top.":
    "كل قسم بيجيب كل الأقسام اللي تحته معاه؛ والمنتجات المختارة بتتضاف فوقهم.",
  Departments: "الأقسام",
  "Hand-picked products": "منتجات مختارة يدويًا",
  "Accepting faculties": "كليات بتقبل",
  "Whole catalogue": "الكتالوج كله",

  // Departments page
  "Which parts of the catalogue the student section covers. Every subcategory beneath a chosen department is included automatically, and the student discount applies to exactly the same list.":
    "أنهي أجزاء من الكتالوج القسم الطلابي بيغطيها. كل قسم فرعي تحت القسم المختار بيتحسب أوتوماتيك، وخصم الطلاب بيطبق على نفس القائمة بالظبط.",
  "Save departments": "حفظ الأقسام",
  "Departments saved.": "تم حفظ الأقسام.",
  "Nothing selected means the whole catalogue — every product is in the section and the discount applies everywhere.":
    "لو ماخترتش حاجة يبقى الكتالوج كله — كل المنتجات في القسم والخصم بيطبق في كل حتة.",

  // Products page
  "Products added to the student section by hand, on top of whatever the departments already bring in. They are the shop's own products — one price, one stock count, edited in one place.":
    "منتجات بتتضاف للقسم الطلابي بإيدك، فوق اللي الأقسام بتجيبه أصلًا. دي منتجات المتجر نفسها — سعر واحد، مخزون واحد، بتتعدّل من مكان واحد.",
  "Add from the catalogue": "أضف من الكتالوج",
  "Search by name in Arabic or English, then add what belongs in the section.":
    "ابحث بالاسم عربي أو إنجليزي، وضيف اللي يخص القسم.",
  "Search products": "ابحث في المنتجات",
  "Searching…": "جاري البحث…",
  "Nothing matched that.": "مفيش نتايج مطابقة.",
  "On the shelf": "على الرف",
  Add: "أضف",
  Stock: "المخزون",
  "Save shelf": "حفظ الرف",
  "Shelf saved.": "تم حفظ الرف.",
  "Hidden on the storefront": "مخفي في الموقع",
  "Nothing picked by hand. The section still shows everything in its departments.":
    "مفيش حاجة مختارة يدويًا. القسم لسه بيعرض كل اللي في أقسامه.",
  "Nothing picked, and no departments chosen — the section shows the whole catalogue.":
    "مفيش حاجة مختارة ولا أقسام متحددة — القسم بيعرض الكتالوج كله.",

  // Offer page
  "The discount applies to the section's departments.": "الخصم بيطبق على أقسام القسم الطلابي.",
  "Change what it covers": "غيّر اللي بيغطيه",
};

for (const [file, useArabic] of [
  ["src/locales/ar.json", true],
  ["src/locales/en.json", false],
]) {
  const raw = await readFile(file, "utf8");
  const existing = JSON.parse(raw);

  const additions = Object.entries(STRINGS)
    .filter(([key]) => !(key in existing))
    .map(([key, ar]) => {
      // The `admin.*` keys are ids, not English sentences — the English file
      // needs a readable label rather than the key echoed back.
      const english = key.startsWith("admin.")
        ? key.slice("admin.student".length).replace(/^./, (c) => c.toUpperCase())
        : key;
      return `  ${JSON.stringify(key)}: ${JSON.stringify(useArabic ? ar : english)}`;
    });

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
