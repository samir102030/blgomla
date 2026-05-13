/**
 * Localize middleware — when the request asks for Arabic, walk the response
 * body and swap stored AR sibling fields (`nameAr`, `descriptionAr`) into
 * the user-facing fields (`name`, `description`). Falls back to the English
 * field when the AR sibling is empty.
 *
 * This replaces the previous Google-translate-on-read middleware which made
 * ~50 outbound HTTP calls per page and frequently hit rate limits, causing
 * AR responses to hang or arrive truncated.
 *
 * Admin/vendor surfaces that need to edit *both* languages should send
 * `?raw=1` (or set the `x-i18n-raw` header) to bypass this localization.
 */

const I18N_FIELDS = ["name", "description", "title", "subtitle"];

const wantsRaw = (req) =>
  req.query?.raw === "1" ||
  req.query?.raw === "true" ||
  req.headers["x-i18n-raw"] === "1";

const isArabic = (req) => {
  const headerLang = (req.headers["accept-language"] || "").toLowerCase();
  const queryLang = (req.query?.lang || "").toLowerCase();
  const customLang = (req.headers["x-language"] || "").toLowerCase();
  return [headerLang, queryLang, customLang].some((v) => v.startsWith("ar"));
};

/**
 * In-place swap on a single document-like object. Doesn't recurse into
 * arbitrary nesting — only into the fields callers typically populate
 * (brand, category, items[].product, orderItems[].product, etc.).
 */
const localizeDoc = (doc) => {
  if (!doc || typeof doc !== "object") return doc;
  for (const f of I18N_FIELDS) {
    const arKey = `${f}Ar`;
    if (typeof doc[arKey] === "string" && doc[arKey].trim()) {
      doc[f] = doc[arKey];
    }
  }
  // Populated refs commonly held on Product / Collection / OrderItem
  if (doc.brand && typeof doc.brand === "object") localizeDoc(doc.brand);
  if (doc.category && typeof doc.category === "object") localizeDoc(doc.category);
  if (doc.product && typeof doc.product === "object") localizeDoc(doc.product);
  if (doc.productDetails && typeof doc.productDetails === "object") {
    localizeDoc(doc.productDetails);
  }
  if (doc.collectionDetails && typeof doc.collectionDetails === "object") {
    localizeDoc(doc.collectionDetails);
    if (Array.isArray(doc.collectionDetails.items)) {
      doc.collectionDetails.items.forEach((it) => {
        if (it?.product && typeof it.product === "object") localizeDoc(it.product);
      });
    }
  }
  if (Array.isArray(doc.items)) {
    doc.items.forEach((it) => {
      if (it?.product && typeof it.product === "object") localizeDoc(it.product);
    });
  }
  if (Array.isArray(doc.orderItems)) {
    doc.orderItems.forEach((it) => {
      if (it?.product && typeof it.product === "object") localizeDoc(it.product);
    });
  }
  if (Array.isArray(doc.parentCategory) || (doc.parentCategory && typeof doc.parentCategory === "object")) {
    if (Array.isArray(doc.parentCategory)) doc.parentCategory.forEach(localizeDoc);
    else localizeDoc(doc.parentCategory);
  }
  if (Array.isArray(doc.subCategories)) doc.subCategories.forEach(localizeDoc);
  return doc;
};

const walk = (value) => {
  if (Array.isArray(value)) {
    value.forEach(walk);
  } else if (value && typeof value === "object") {
    localizeDoc(value);
    // Recurse into common envelope keys
    for (const key of [
      "products",
      "brands",
      "categories",
      "collections",
      "cart",
      "orders",
      "data",
      "saleProducts",
      "newestProducts",
      "featured",
      "advertisements",
    ]) {
      if (value[key]) walk(value[key]);
    }
  }
};

export const translateResponse = (req, res, next) => {
  if (wantsRaw(req) || !isArabic(req)) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    try {
      if (body && body.success !== false) walk(body);
    } catch (err) {
      console.error("Localize middleware error:", err);
    }
    return originalJson(body);
  };
  next();
};
