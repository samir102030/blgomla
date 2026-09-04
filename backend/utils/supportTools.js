/**
 * What the support assistant is allowed to look at.
 *
 * Every answer the assistant gives about this shop comes from one of these
 * functions, and each one decides for itself what the caller may see. That is
 * the point of putting them together: the assistant can be asked anything, so
 * the boundary cannot live in the asking — it has to live here, where a single
 * reading tells you that an order query is never built without a user on it.
 *
 * Nothing here takes an id out of the customer's message and trusts it. An
 * order is found by matching a reference *within* that customer's own orders,
 * so a guessed or copied reference belonging to someone else finds nothing
 * rather than finding someone else's order.
 */
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import { collectCategoryIds } from "./categoryTree.js";
import { getShippingSettings } from "../models/shippingSettings.model.js";

/**
 * Arabic is typed the way it is spoken, not the way it is spelled. The same
 * word arrives as طلبي / طلبى, إرجاع / ارجاع, شاشة / شاشه — so the shapes that
 * differ only in a hamza, a dotted yaa or a taa marbuta are folded together
 * before anything is matched against them.
 */
/** Where a link the assistant hands out has to point. */
const SITE_URL = (process.env.SITE_URL || "https://belgmla.com").replace(/\/+$/, "");

export const normalizeArabic = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The shop speaks Arabic and its catalogue does not.
 *
 * Six thousand of the products carry no Arabic name at all — they were
 * imported from suppliers' English sheets — so a customer typing لابتوب, which
 * is the ordinary word for the thing, matches nothing in a shop full of
 * laptops. These are the words people actually use at the counter, mapped to
 * the words the rows are written in.
 *
 * Phrases are listed before single words and replaced first: كارت شاشة is a
 * graphics card, and translating its two halves separately would ask for a
 * "card monitor".
 */
const PHRASES = [
  ["كارت شاشه", "graphics card"],
  ["كارت الشاشه", "graphics card"],
  ["لوحه مفاتيح", "keyboard"],
  ["لوحه ام", "motherboard"],
  ["باور سبلاي", "power supply"],
  ["اكسس بوينت", "access point"],
  ["هارد ديسك", "hard drive"],
  ["لاب توب", "laptop"],
];

const WORDS = {
  لابتوب: "laptop",
  لاب: "laptop",
  شاشه: "monitor",
  شاشات: "monitor",
  هارد: "hard",
  رام: "ram",
  رامات: "ram",
  معالج: "processor",
  بروسيسور: "processor",
  مذربورد: "motherboard",
  طابعه: "printer",
  طابعات: "printer",
  راوتر: "router",
  كاميرا: "camera",
  كاميرات: "camera",
  سماعه: "headset",
  سماعات: "headset",
  كيبورد: "keyboard",
  ماوس: "mouse",
  فلاشه: "flash",
  فلاش: "flash",
  سيرفر: "server",
  تابلت: "tablet",
  موبايل: "phone",
  مروحه: "fan",
  كيسه: "case",
  كيس: "case",
  شاحن: "charger",
  كابل: "cable",
  سويتش: "switch",
  ماك: "macbook",
  ايفون: "iphone",
  // Units, which people say in Arabic and every row spells in English.
  تيرا: "tb",
  جيجا: "gb",
  ميجا: "mb",
  بوصه: "inch",
  انش: "inch",
  وايرلس: "wireless",
  خارجي: "external",
  داخلي: "internal",
};

/**
 * "الراوتر" is "راوتر" wearing the definite article.
 *
 * Arabic glues the article onto the front of the word and the plural onto the
 * back, and every table in this file is filed under the bare singular. So half
 * the sentences customers actually type — "اللابتوب ده متوفر؟", "عندكم
 * الكاميرات دي" — looked up nothing at all: not translated, so searched in
 * Arabic against six thousand rows whose names are in English.
 *
 * The word as typed is always tried first and only then the stripped forms, and
 * the article only comes off words long enough that losing two letters still
 * leaves a word — so "الفا" stays "الفا".
 */
const bareForms = (word) => {
  const forms = [word];
  const stem = word.length > 4 && word.startsWith("ال") ? word.slice(2) : word;
  if (stem !== word) forms.push(stem);
  for (const suffix of ["ات", "ين", "ون", "هم", "ها"]) {
    if (stem.endsWith(suffix) && stem.length - suffix.length >= 3) {
      forms.push(stem.slice(0, -suffix.length));
    }
  }
  // كاميرات is كاميرا plus a taa, and dropping the whole "ات" leaves كامير.
  if (stem.length >= 5 && stem.endsWith("ت")) forms.push(stem.slice(0, -1));
  return forms;
};

/** The bare form a lookup table would have this word filed under, if any. */
const bare = (word) => bareForms(word).find((form) => WORDS[form]) || bareForms(word)[1] || word;

/** The English the row is written in, kept beside the Arabic that was typed. */
const withEnglish = (term) => {
  let out = normalizeArabic(term);
  for (const [arabic, english] of PHRASES) out = out.split(arabic).join(english);
  return out
    .split(/\s+/)
    .map((word) => WORDS[word] || WORDS[bare(word)] || word)
    .join(" ")
    .trim();
};

/**
 * Does this sentence name something the shop sells?
 *
 * The intent list reads a question by the words that frame it — "بكام",
 * "عندكم", "عايز". A customer who types "لابتوب للشغل حدود 25 الف" frames
 * nothing; they just say what they want, and the sentence fell through to
 * "I did not understand" while the catalogue held forty answers to it.
 *
 * So the goods themselves are also a signal. This is the same vocabulary the
 * search already translates with, which keeps the two in step: a word that can
 * find a product is a word that can start a product question.
 */
const PRODUCT_NOUNS = new Set([
  ...Object.keys(WORDS).map((w) => normalizeArabic(w)),
  ...PHRASES.map(([arabic]) => normalizeArabic(arabic)),
  ...Object.values(WORDS),
  // English as customers type it, which is rarely the noun in the row.
  "laptop", "notebook", "pc", "monitor", "screen", "router", "switch", "camera",
  "cctv", "dvr", "nvr", "printer", "scanner", "headset", "speaker", "keyboard",
  "mouse", "ssd", "hdd", "ram", "cpu", "gpu", "ups", "server", "tablet",
  "iphone", "macbook", "playstation", "ps5", "xbox",
]);

export const namesAProduct = (text) => {
  const folded = normalizeArabic(text);
  if (PHRASES.some(([arabic]) => folded.includes(normalizeArabic(arabic)))) return true;
  return folded
    .split(/[\s,،.؟?!]+/)
    .some(
      (word) =>
        word.length >= 2 && bareForms(word).some((form) => PRODUCT_NOUNS.has(form))
    );
};

/**
 * The shelf a word names — "لابتوب" is the Laptops category, not a word to
 * look for inside product names.
 *
 * Searching the name alone is how "كل اللابات تحت 25 ألف" answered with a
 * keyboard sticker and a patch cord: both are called "… For Laptop …", both
 * cost less than 25,000, and by the only test the search applied they were
 * laptops. Filed under the right shelf, the same question returns 128 machines
 * and nothing else.
 *
 * Deliberately conservative. A category is used only when its whole name *is*
 * the word — "Laptops", "Routers", "Monitors" — because a near match narrows
 * the answer instead of sharpening it: "كاميرا" resolving to "IP Cameras"
 * would quietly hide every analogue camera in the shop. Anything that does not
 * match exactly falls through to the search that was there before.
 */
const CATEGORY_TTL_MS = 10 * 60 * 1000;
let categoryIndex = null;
let categoryIndexAt = 0;

/** Plural to singular, in both languages, as far as a shop needs it. */
const singular = (word) => {
  if (/[a-z0-9]$/.test(word)) {
    if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
    if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
    if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
    return word;
  }
  return bareForms(word).slice(-1)[0];
};

/** The one word a category is called, or nothing if it is called several. */
const soleWord = (label) => {
  const parts = normalizeArabic(label).split(/[^0-9a-z؀-ۿ]+/).filter(Boolean);
  return parts.length === 1 ? singular(parts[0]) : null;
};

const loadCategoryIndex = async () => {
  if (categoryIndex && Date.now() - categoryIndexAt < CATEGORY_TTL_MS) return categoryIndex;

  const rows = await Category.find({ deleted: { $ne: true } })
    .select("_id name nameAr level")
    .lean();

  const index = new Map();
  for (const row of rows) {
    for (const label of [row.name, row.nameAr]) {
      const key = soleWord(label);
      if (!key) continue;
      // The shallowest wins: "Laptops" over "Used Laptops" for the same word.
      const held = index.get(key);
      if (!held || (row.level ?? 9) < (held.level ?? 9)) index.set(key, row);
    }
  }

  categoryIndex = index;
  categoryIndexAt = Date.now();
  return index;
};

/**
 * @returns {Promise<{id: string, name: string, ids: string[]}|null>} the shelf
 *   the sentence names, with every category beneath it — products hang off the
 *   leaves, so the branch on its own would match nothing.
 */
export const categoryFor = async (text) => {
  const index = await loadCategoryIndex();

  for (const raw of normalizeArabic(text).split(/[\s,،.؟?!]+/)) {
    if (raw.length < 3) continue;
    // The word as typed, the English the catalogue files it under, and both
    // without the article or the plural.
    const tries = new Set();
    for (const form of bareForms(raw)) {
      tries.add(singular(form));
      if (WORDS[form]) tries.add(singular(WORDS[form]));
    }

    for (const form of tries) {
      const hit = index.get(form);
      if (hit) {
        return { id: String(hit._id), name: hit.name, ids: await collectCategoryIds(hit._id) };
      }
    }
  }
  return null;
};

/**
 * The governorate in "الشحن للاسكندرية بكام".
 *
 * `shippingFacts` has taken one since it was written and nothing ever passed
 * it, so the answer was the national one however specific the question. Matched
 * against the shop's own configured zones first — those are the names the fees
 * are filed under — and against a spelling list only as a fallback, so a zone
 * named in a way this list never anticipated still resolves.
 */
const GOVERNORATES = [
  "القاهره", "الجيزه", "الاسكندريه", "اسكندريه", "القليوبيه", "الشرقيه",
  "الدقهليه", "المنصوره", "البحيره", "دمنهور", "الغربيه", "طنطا", "المنوفيه",
  "كفر الشيخ", "دمياط", "بورسعيد", "الاسماعيليه", "السويس", "شمال سيناء",
  "جنوب سيناء", "بني سويف", "الفيوم", "المنيا", "اسيوط", "سوهاج", "قنا",
  "الاقصر", "اسوان", "البحر الاحمر", "الغردقه", "الوادي الجديد", "مطروح",
  "العلمين", "الساحل الشمالي", "6 اكتوبر", "الشيخ زايد", "العاشر من رمضان",
];

export const governorateIn = async (text) => {
  const folded = normalizeArabic(text);
  const { zones = [] } = await shippingFacts();
  const configured = zones
    .map((z) => z.governorate)
    .find((name) => name && folded.includes(normalizeArabic(name)));
  if (configured) return configured;
  return GOVERNORATES.find((name) => folded.includes(normalizeArabic(name))) || null;
};

/** What the customer sees on their orders page, and so what they will quote. */
export const orderReference = (id) => String(id).slice(-8).toUpperCase();

/** Pull anything that looks like an order reference out of a sentence. */
export const referenceIn = (text) => {
  const match = String(text || "")
    .toUpperCase()
    .match(/[0-9A-F]{8,24}/g);
  return match ? match[0] : null;
};

const money = (n) => Math.round(Number(n || 0));

const orderSummary = (order) => ({
  reference: orderReference(order._id),
  id: String(order._id),
  status: order.status,
  placedAt: order.createdAt,
  total: money(order.totalPrice),
  delivered: !!order.isDelivered,
  deliveredAt: order.deliveredAt || null,
  tracking: order.trackingNumber || null,
  items: (order.orderItems || []).map((item) => ({
    name: item.product?.name || item.collectionName || "",
    nameAr: item.product?.nameAr || "",
    quantity: item.quantity,
    price: money(item.price),
  })),
});

/** The caller's own recent orders. Never anyone else's — see the file note. */
export const recentOrders = async (user, { limit = 5 } = {}) => {
  if (!user) return [];
  const orders = await Order.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 10))
    .populate("orderItems.product", "name nameAr")
    .lean();
  return orders.map(orderSummary);
};

/**
 * One of the caller's orders by the reference they quoted.
 *
 * The reference is the tail of the id, so it is matched against the caller's
 * own orders rather than looked up directly: a customer reading out someone
 * else's reference gets "not found", which is the honest answer to "where is
 * *my* order" when it isn't theirs.
 */
export const findOrder = async (user, reference) => {
  if (!user || !reference) return null;
  const wanted = String(reference).toUpperCase().replace(/^#/, "");
  const orders = await Order.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("orderItems.product", "name nameAr")
    .lean();
  const hit = orders.find(
    (o) =>
      orderReference(o._id) === wanted ||
      String(o._id).toUpperCase().endsWith(wanted)
  );
  return hit ? orderSummary(hit) : null;
};

/**
 * Catalogue search, seen exactly as a shopper sees it.
 *
 * No filter is lifted here on purpose. The Product model hides the Electronics
 * shelf from plain finds, and an assistant that quietly saw more than the
 * storefront does would answer questions about things the customer cannot
 * reach from any page.
 */
export const searchProducts = async (
  query,
  { limit = 5, strict = false, maxPrice = 0, sort = null, category = null, withTotal = false } = {}
) => {
  // Two readings of the same question. Rows imported from suppliers are named
  // in English and rows entered by hand are named in Arabic, so the words the
  // customer typed are tried as they were typed and again translated, and
  // whichever half of the catalogue holds the answer is reached.
  const arabic = normalizeArabic(query);
  const english = withEnglish(query);
  const term = english;
  // Nothing to search for. Shaped like every other answer, because a caller
  // that asked for a total and got a bare array back crashes on the first
  // property it reads.
  if (term.length < 2) return withTotal ? { items: [], total: 0 } : [];

  const rx = (word) => new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const anyField = (word) => ({ $or: [{ name: rx(word) }, { nameAr: rx(word) }, { sku: rx(word) }] });

  /**
   * People type "msi monitor", and no product is called that — it is an "MSI
   * MAG 276CF … Gaming Monitor". Matching the sentence as one string finds
   * nothing, so each word has to be found somewhere in the row and the row
   * kept only if all of them are.
   *
   * Stripped to the bare word for these passes only, and safely so: they match
   * a substring, and "راوتر" finds both "راوتر" and "الراوتر" while "الراوتر"
   * finds only one of them. The text index above still sees the sentence as it
   * was typed.
   */
  const wordsOf = (text) =>
    text.split(/\s+/).filter((w) => w.length >= 2).slice(0, 6).map(bare);
  const words = wordsOf(english);
  const arabicWords = arabic === english ? [] : wordsOf(arabic);

  /*
    A ceiling belongs in the query rather than in a filter over the answer.

    The index ranks rows by how well the words matched, which says nothing about
    price, so filtering afterwards threw away the whole shortlist whenever the
    best-matching rows happened to be the expensive ones — and the shop told a
    customer with 25,000 to spend that it had nothing for him. The widest
    discount the shop allows is 13%, so the cut is made a little above the
    ceiling and the exact figure is checked by the caller against the sale price.

    `$gt: 0` matters as much as the ceiling. Sixty-seven of the rows under
    25,000 are under it because they carry no price at all — a price of zero is
    the shop not having set one, not the thing being free — and sorted cheapest
    first they filled the whole answer with laptops offered at nothing.
  */
  const ceiling =
    maxPrice > 0 ? { price: { $gt: 0, $lte: Math.round(maxPrice / 0.87) } } : {};

  // The shelf, when the sentence named one. Products hang off the leaves, so
  // it is the whole subtree or nothing.
  const shelf = category?.ids?.length ? { category: { $in: category.ids } } : {};

  const base = {
    isActive: { $ne: false },
    deleted: { $ne: true },
    /*
      The same gate the storefront uses. A vendor's product waiting on approval
      is not on any page a customer can reach, and the assistant was quoting it
      a price for it — the one thing this file's whole design is meant to
      prevent. `approvalStatus` defaults to "pending", so this is the difference
      between the catalogue and the queue behind it.
    */
    approvalStatus: "approved",
    ...ceiling,
    ...shelf,
  };

  // Which conditions produced the rows, so a total can be counted for exactly
  // the same question rather than for a wider one.
  let matched = null;

  const run = async (conditions, { byScore = false } = {}) => {
    const query = Product.find({ ...base, ...conditions })
      .select("name nameAr slug price salePercentage stock images brand")
      .populate("brand", "name")
      .limit(Math.min(limit, 24));

    if (sort === "price_asc") {
      // Asked for a list under a budget, the useful order is cheapest first —
      // not how well the words matched, which the customer cannot see.
      query.sort({ price: 1 });
    } else if (byScore) {
      // A text search matches any of the words, so "msi monitor" pulls every
      // monitor in the shop. Ranking puts the rows that matched both first —
      // without it the answer is confidently about the wrong brand.
      query.select({ score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } });
    }

    const rows = await query.lean();
    if (rows.length && !matched) matched = conditions;
    return rows;
  };

  /** How many rows the question has in total, not just how many were shown. */
  const totalFor = async (rows) => {
    if (!withTotal) return undefined;
    if (!rows.length) return 0;
    return Product.countDocuments({ ...base, ...(matched || {}) });
  };

  /**
   * `url` is built here rather than left to the caller.
   *
   * The assistant is asked for a link a dozen times a day and the product
   * page is keyed by id, not slug — so a model asked to compose the link
   * from a slug produces a plausible URL that 404s. Handing it the finished
   * link is the difference between a customer tapping through and a customer
   * deciding the shop is broken.
   */
  const shape = (rows) =>
    rows.map((p) => ({
      id: String(p._id),
      name: p.name,
      nameAr: p.nameAr || "",
      slug: p.slug,
      url: `${SITE_URL}/product/${p._id}`,
      brand: p.brand?.name || "",
      price: money(p.price),
      salePrice: p.salePercentage ? money(p.price * (1 - p.salePercentage / 100)) : null,
      inStock: Number(p.stock || 0) > 0,
      stock: Number(p.stock || 0),
      image: p.images?.[0]?.url || p.images?.[0] || null,
    }));

  /**
   * `strict` is for the caller that is *guessing* the sentence was a product
   * name rather than having been told so. A text search matches any one of the
   * words, which means "I want to talk to someone" comes back holding a
   * security camera — confident, irrelevant, and worse than no answer. Under
   * strict every word has to appear in the row, so a guess that is wrong finds
   * nothing and the assistant admits it did not understand, which is true.
   */
  const answer = async (rows) =>
    withTotal ? { items: shape(rows), total: await totalFor(rows) } : shape(rows);

  if (strict) {
    let rows = words.length ? await run({ $and: words.map(anyField) }) : [];
    if (!rows.length && arabicWords.length) {
      rows = await run({ $and: arabicWords.map(anyField) });
    }
    return answer(rows);
  }

  /*
    "كل اللابات تحت 25 ألف" names a shelf and nothing else, and there the shelf
    *is* the question: requiring the word as well would drop the machines whose
    row happens to be called a Notebook. But "لابتوب lenovo حدود 25 الف" names a
    shelf *and* a make, and answering that with the twelve cheapest laptops in
    the shop would be ignoring half of what was asked — so the shelf only stands
    in for the search when it is all the customer gave.
  */
  const shelfIsTheQuestion =
    category?.ids?.length && sort === "price_asc" && words.length <= 1;

  if (shelfIsTheQuestion) {
    const shelfRows = await run({});
    if (shelfRows.length) return answer(shelfRows);
  }

  /**
   * The catalogue runs to five figures, and a regular expression over it is a
   * collection scan every time somebody asks a question. The text index on the
   * product name answers the common case — Latin names, several words, in any
   * order — in one indexed lookup, so it is tried first and the scan is kept
   * for what the index cannot see: Arabic names and SKUs.
   */
  let products = await run({ $text: { $search: term } }, { byScore: true });

  if (!products.length && words.length) {
    products = await run({ $and: words.map(anyField) });
  }
  if (!products.length && arabicWords.length) {
    products = await run({ $and: arabicWords.map(anyField) });
  }

  // One wrong word should not lose the whole search; the longest is the most
  // specific thing they typed.
  if (!products.length && words.length > 1) {
    const longest = words.slice().sort((a, b) => b.length - a.length)[0];
    products = await run(anyField(longest));
  }
  if (!products.length && !words.length) products = await run(anyField(term));

  /*
    Last resort with a shelf in hand: the words found nothing, but the customer
    did tell us which aisle to look down. Better the right aisle than "we do not
    stock that".
  */
  if (!products.length && category?.ids?.length) products = await run({});

  return answer(products);
};

/**
 * Shipping, answered from the shop's own settings rather than from a sentence
 * somebody typed into a policy page a year ago. The zone table is the same one
 * checkout charges from, so the number the assistant quotes is the number the
 * customer will pay.
 */
export const shippingFacts = async (governorate) => {
  const s = await getShippingSettings();
  const zone =
    governorate &&
    (s.zones || []).find((z) =>
      String(z.governorate).toLowerCase().includes(String(governorate).toLowerCase())
    );

  return {
    enabled: s.enabled !== false,
    fee: money(zone ? zone.fee : s.defaultFee),
    zone: zone ? zone.governorate : null,
    freeOver: money(s.freeShippingThreshold),
    daysMin: zone?.deliveryDaysMin || s.deliveryDaysMin,
    daysMax: zone?.deliveryDaysMax || s.deliveryDaysMax,
    zones: (s.zones || []).map((z) => ({ governorate: z.governorate, fee: money(z.fee) })),
  };
};

export default {
  namesAProduct,
  governorateIn,
  categoryFor,
  orderReference,
  referenceIn,
  recentOrders,
  findOrder,
  searchProducts,
  shippingFacts,
};
