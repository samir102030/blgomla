// ─────────────────────────────────────────────────────────────────────────
// SECTION REGISTRY — what may appear on a storefront page.
//
// Developers add entries here; admins arrange them. That split is the whole
// point: the layout editor composes from this catalogue and cannot invent
// section types, so no arrangement an admin saves can produce markup nobody
// wrote. The admin UI renders itself from this file (served over
// /api/layouts/registry), so a new section shows up in the editor as soon as
// it is listed here and mapped to a component on the client.
//
// `slot` groups sections into regions of the page. `locked: true` marks a
// section the editor may reorder within its slot but never remove or switch
// off — the ones carrying navigation or legal footer content.
// ─────────────────────────────────────────────────────────────────────────

export const SLOTS = [
  { key: "home.top", label: { en: "Top of page", ar: "أعلى الصفحة" } },
  { key: "home.main", label: { en: "Main body", ar: "المحتوى الرئيسي" } },
  { key: "home.bottom", label: { en: "Bottom of page", ar: "أسفل الصفحة" } },
];

export const SECTIONS = [
  {
    key: "hero",
    label: { en: "Hero carousel", ar: "سلايدر الواجهة" },
    hint: { en: "The rotating banner at the top", ar: "البانر المتحرك في الأعلى" },
    slots: ["home.top"],
    locked: true,
  },
  {
    key: "services",
    label: { en: "Trust bar", ar: "شريط الضمانات" },
    hint: { en: "Delivery, warranty and support promises", ar: "الشحن والضمان والدعم" },
    slots: ["home.top", "home.main", "home.bottom"],
  },
  {
    key: "categoryRail",
    label: { en: "Shop by category", ar: "تسوق حسب القسم" },
    hint: { en: "Horizontal rail of category cards", ar: "شريط أفقي بكروت الأقسام" },
    slots: ["home.top", "home.main"],
  },
  {
    key: "adCategoryStrip",
    label: { en: "Ad — category strip", ar: "إعلان — شريط الأقسام" },
    hint: { en: "Promo slot below the category rail", ar: "مساحة إعلانية تحت شريط الأقسام" },
    slots: ["home.top", "home.main"],
  },
  {
    key: "cardMosaic",
    label: { en: "Card mosaic", ar: "شبكة الكروت" },
    hint: { en: "Curated merchandising grid", ar: "شبكة عروض بتتظبط من لوحة التحكم" },
    slots: ["home.main"],
  },
  {
    key: "couponStrip",
    label: { en: "Coupon strip", ar: "شريط الكوبونات" },
    hint: { en: "Collectible public coupons", ar: "كوبونات العملاء المعلنة" },
    slots: ["home.top", "home.main"],
  },
  {
    key: "flashDeals",
    label: { en: "Flash deals", ar: "عروض سريعة" },
    hint: { en: "Sale products with a countdown", ar: "منتجات مخفضة مع عداد تنازلي" },
    slots: ["home.main"],
  },
  {
    key: "adHero",
    label: { en: "Ad — hero banner", ar: "إعلان — بانر رئيسي" },
    hint: { en: "Full-width promotional break", ar: "بانر عريض بين الأقسام" },
    slots: ["home.main"],
  },
  {
    key: "featured",
    label: { en: "Featured picks", ar: "المختارات" },
    hint: { en: "Editor-selected products", ar: "منتجات مختارة" },
    slots: ["home.main"],
  },
  {
    key: "bestsellers",
    label: { en: "Bestsellers", ar: "الأكثر مبيعاً" },
    hint: { en: "Most-ordered products", ar: "أكتر المنتجات طلباً" },
    slots: ["home.main"],
  },
  {
    key: "topRated",
    label: { en: "Top rated", ar: "الأعلى تقييماً" },
    hint: { en: "Highest customer ratings", ar: "أعلى تقييمات العملاء" },
    slots: ["home.main"],
  },
  {
    key: "recentlyViewed",
    label: { en: "Recently viewed", ar: "شوهدت مؤخراً" },
    hint: { en: "Personalised, per browser", ar: "لكل زائر حسب تصفحه" },
    slots: ["home.main", "home.bottom"],
  },
  {
    key: "brandLogos",
    label: { en: "Trusted brands", ar: "البراندات" },
    hint: { en: "Brand logo strip", ar: "شريط شعارات البراندات" },
    slots: ["home.main", "home.bottom"],
  },
  {
    key: "newArrivals",
    label: { en: "Newest arrivals", ar: "وصل حديثاً" },
    hint: { en: "Most recently added products", ar: "أحدث المنتجات المضافة" },
    slots: ["home.main"],
  },
  {
    key: "adBanner",
    label: { en: "Ad — secondary banner", ar: "إعلان — بانر ثانوي" },
    hint: { en: "Second promotional slot", ar: "مساحة إعلانية تانية" },
    slots: ["home.main", "home.bottom"],
  },
  {
    key: "bundleDeals",
    label: { en: "Bundle deals", ar: "عروض الباقات" },
    hint: { en: "Collections sold together", ar: "المجموعات المباعة كباقة" },
    slots: ["home.main"],
  },
  {
    key: "allProducts",
    label: { en: "All products", ar: "كل المنتجات" },
    hint: { en: "Full catalogue grid", ar: "شبكة الكتالوج الكامل" },
    slots: ["home.main", "home.bottom"],
  },
  {
    key: "newsletter",
    label: { en: "Newsletter signup", ar: "الاشتراك في النشرة" },
    hint: { en: "Email capture before the footer", ar: "جمع الإيميلات قبل الفوتر" },
    slots: ["home.bottom"],
  },
];

export const SECTION_KEYS = SECTIONS.map((s) => s.key);
export const SLOT_KEYS = SLOTS.map((s) => s.key);

export const getSection = (key) => SECTIONS.find((s) => s.key === key);

/** Is this section allowed to sit in this slot? */
export const sectionFitsSlot = (key, slot) => {
  const section = getSection(key);
  return Boolean(section && section.slots.includes(slot));
};

// The arrangement the storefront shipped with, used to seed a page the first
// time it is opened in the editor. Order values are spaced so a section
// dragged between two others gets a value in the gap and only that one row
// is rewritten; a save renumbers the slot when the gaps get too tight.
export const DEFAULT_HOME_LAYOUT = [
  { key: "hero", slot: "home.top" },
  { key: "services", slot: "home.top" },
  { key: "categoryRail", slot: "home.top" },
  { key: "adCategoryStrip", slot: "home.top" },
  { key: "cardMosaic", slot: "home.main" },
  { key: "couponStrip", slot: "home.main" },
  { key: "flashDeals", slot: "home.main" },
  { key: "adHero", slot: "home.main" },
  { key: "featured", slot: "home.main" },
  { key: "bestsellers", slot: "home.main" },
  { key: "topRated", slot: "home.main" },
  { key: "recentlyViewed", slot: "home.main" },
  { key: "brandLogos", slot: "home.main" },
  { key: "newArrivals", slot: "home.main" },
  { key: "adBanner", slot: "home.main" },
  { key: "bundleDeals", slot: "home.main" },
  { key: "allProducts", slot: "home.bottom" },
  { key: "newsletter", slot: "home.bottom" },
].map((s, i) => ({ ...s, order: (i + 1) * 1000, enabled: true }));

export const PAGES = [{ key: "home", label: { en: "Home page", ar: "الصفحة الرئيسية" } }];
export const PAGE_KEYS = PAGES.map((p) => p.key);
