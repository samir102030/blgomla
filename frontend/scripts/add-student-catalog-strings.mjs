/**
 * Copy for the section's own catalogue — its departments, its products, and
 * the shelf they land on. Same line-wise append as the others; safe to re-run.
 */
import { readFile, writeFile } from "node:fs/promises";

const STRINGS = {
  // ── Departments ──
  "The student section's own departments — nothing to do with the shop's catalogue. Products are filed under them, and a department shows everything beneath it.":
    "أقسام القسم الطلابي الخاصة بيه — مالهاش أي علاقة بكتالوج المتجر. المنتجات بتتحط تحتها، والقسم بيعرض كل اللي تحته.",
  "New department": "قسم جديد",
  "Edit department": "تعديل القسم",
  "Add department": "أضف القسم",
  "Save department": "حفظ القسم",
  "Department added.": "تمت إضافة القسم.",
  "Department updated.": "تم تحديث القسم.",
  "Department removed.": "تم حذف القسم.",
  "Remove this department?": "تحذف القسم ده؟",
  "Could not save the department.": "مقدرناش نحفظ القسم.",
  "Could not remove the department.": "مقدرناش نحذف القسم.",
  "Could not load the departments.": "مقدرناش نحمّل الأقسام.",
  "Department not found.": "القسم مش موجود.",
  "A department needs a name.": "القسم لازم يبقى ليه اسم.",
  "A department cannot be its own parent.": "القسم مينفعش يبقى أب لنفسه.",
  "That move would put the department inside itself.": "النقل ده هيحط القسم جوه نفسه.",
  "Empty the departments under this one first.": "فضّي الأقسام اللي تحته الأول.",
  "Move or remove the products in this department first.": "انقل أو احذف منتجات القسم ده الأول.",
  "Sits under": "تحت",
  "Top level": "مستوى أول",
  "Leave empty for a top-level department.": "سيبه فاضي لو قسم رئيسي.",
  Order: "الترتيب",
  "Lower numbers come first.": "الأرقام الأصغر بتيجي الأول.",
  "Shown on the section": "ظاهر في القسم",
  Hidden: "مخفي",
  "No departments yet. The section needs at least one before a product can be filed.":
    "مفيش أقسام لسه. القسم محتاج واحد على الأقل قبل ما تحط فيه منتج.",
  "Name (English)": "الاسم (إنجليزي)",
  "Name (Arabic)": "الاسم (عربي)",

  // ── Products ──
  "The section's own products. They exist here and nowhere else on the shop, and they are bought, paid for and shipped through the same checkout as everything else.":
    "منتجات القسم الخاصة بيه. موجودة هنا وبس، ومش موجودة في أي مكان تاني في المتجر — وبتتشترى وبتتدفع وبتتشحن من نفس مسار الشراء زي أي حاجة تانية.",
  "New product": "منتج جديد",
  "Edit product": "تعديل المنتج",
  "Save product": "حفظ المنتج",
  "Product added.": "تمت إضافة المنتج.",
  "Product updated.": "تم تحديث المنتج.",
  "Product removed.": "تم حذف المنتج.",
  "Remove this product?": "تحذف المنتج ده؟",
  "Could not save the product.": "مقدرناش نحفظ المنتج.",
  "Could not remove the product.": "مقدرناش نحذف المنتج.",
  "Product not found.": "المنتج مش موجود.",
  "A product needs a name.": "المنتج لازم يبقى ليه اسم.",
  "A product needs a price above zero.": "المنتج لازم يبقى ليه سعر أكبر من صفر.",
  "No products yet.": "مفيش منتجات لسه.",
  "Add a department first — a product needs somewhere to sit.":
    "ضيف قسم الأول — المنتج محتاج مكان يقعد فيه.",
  "All departments": "كل الأقسام",
  Department: "القسم",
  Unfiled: "من غير قسم",
  Price: "السعر",
  SKU: "كود المنتج",
  "Optional. Must be unique if set.": "اختياري. لازم يبقى فريد لو كتبته.",
  "Description (English)": "الوصف (إنجليزي)",
  "Description (Arabic)": "الوصف (عربي)",
  Images: "الصور",
  "Uploading…": "جاري الرفع…",
  "Could not upload the image.": "مقدرناش نرفع الصورة.",
  "Featured first": "يظهر الأول",
  Edit: "تعديل",
  Cancel: "إلغاء",

  // ── Overview / offer ──
  "The section has nothing to sell yet.": "القسم مالوش حاجة يبيعها لسه.",
  "Add a product": "ضيف منتج",
  "A shop inside the shop: its own departments, its own products, open to students who prove enrolment with a faculty email.":
    "متجر جوه المتجر: أقسامه ومنتجاته الخاصة بيه، مفتوح للطلاب اللي بيثبتوا قيدهم ببريد الكلية.",
  "Its own products, filed in its own departments. Nothing here appears on the main shop.":
    "منتجاته الخاصة، متحطّة في أقسامه الخاصة. مفيش حاجة هنا بتظهر في المتجر الرئيسي.",
  "The code pays for everything in the student section, and for nothing on the main shop.":
    "الكود بيدفع لكل اللي في قسم الطلاب، ومابيدفعش لأي حاجة في المتجر الرئيسي.",
  "See what is in it": "شوف اللي فيه",
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
