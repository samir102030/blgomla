/**
 * What the support assistant says back.
 *
 * There are two engines here and they answer from the same place. The rules
 * engine reads the question for what it is about and calls the tools directly;
 * the model engine hands the same tools to Claude and lets it decide. Neither
 * one invents a fact about this shop — every number in a reply came out of
 * `supportTools`, which is the only thing either engine can reach.
 *
 * The rules engine is not a stand-in for the other. It runs when no model key
 * is configured, and it also runs when the model call fails, which is the more
 * important of the two: a customer asking where their order is at midnight
 * gets an answer whether or not an API somewhere else is up.
 */
import {
  recentOrders,
  findOrder,
  searchProducts,
  shippingFacts,
  referenceIn,
  normalizeArabic,
  namesAProduct,
  governorateIn,
  categoryFor,
  brandFor,
  brandShelves,
  namesOnlyABrand,
} from "./supportTools.js";

const MODEL = process.env.SUPPORT_MODEL || "claude-sonnet-5";

/*
  Two models can drive this file, and which one is a question of what the shop
  has paid for rather than of anything in the code. Claude first when its key is
  there; Gemini's free tier when it is not, which is the difference between a
  shop that can answer "ايه الفرق بين DVR و NVR" and one that cannot. Neither
  key configured means the rules engine, exactly as before.
*/
/*
  A list, not a name. Google retires ids without warning — `gemini-2.5-flash`
  answers a 404 telling you to move on — and the free tier answers 503 whenever
  the model it points at is busy, which on an alias like `gemini-flash-latest`
  is often. So the shop keeps an ordered list and walks it: the first id that
  answers wins, a dead id is skipped, a busy one is retried once and then
  skipped. GEMINI_MODEL overrides the list and may itself be comma-separated,
  so a future retirement is an environment variable rather than a deploy.
*/
const GEMINI_MODELS = (
  process.env.GEMINI_MODEL || "gemini-3.6-flash,gemini-flash-latest,gemini-3.5-flash"
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

// Busy or broken on Google's side: worth one more go. Anything else — a bad id,
// a bad key, a bad request — will fail exactly the same way twice.
const GEMINI_RETRIABLE = new Set([429, 500, 502, 503, 504]);

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hasClaude = () => !!process.env.ANTHROPIC_API_KEY;
const hasGemini = () => !!process.env.GEMINI_API_KEY;
const hasModel = () => hasClaude() || hasGemini();

/* ─────────────────────────── reading the question ─────────────────────────── */

// The same folding the catalogue search uses, so a word that finds a product
// there is a word that is recognised here.
const normalize = normalizeArabic;

const INTENTS = [
  {
    name: "human",
    patterns: [
      "موظف", "بني ادم", "حد يكلمني", "خدمه العملاء", "اكلم حد", "اكلم حضرتك",
      "عايز اكلم", "محتاج اكلم", "حد من الفريق", "واتساب", "الدعم",
      "whatsapp", "human", "agent", "representative", "customer service",
      "customer support", "real person", "someone", "somebody",
    ],
  },
  {
    name: "order",
    patterns: [
      "فين طلبي", "طلبي", "طلباتي", "اوردر", "الاوردر", "شحنتي", "وصل امتي",
      "تتبع", "رقم التتبع", "متاخر",
      "my order", "where is my order", "track", "tracking", "shipment", "delivery status",
    ],
  },
  {
    name: "returns",
    patterns: [
      "ارجاع", "مرتجع", "استبدال", "استرجاع", "ارجع", "رجع المنتج", "فلوسي",
      "return", "refund", "exchange", "send it back",
    ],
  },
  {
    name: "warranty",
    patterns: ["ضمان", "عطل", "مش شغال", "خربان", "warranty", "faulty", "broken", "defective"],
  },
  {
    name: "shipping",
    patterns: [
      "الشحن", "التوصيل", "شحن", "توصيل", "كام يوم", "يوصل امتي", "مصاريف الشحن",
      "shipping", "delivery", "how long", "how many days", "courier",
    ],
  },
  {
    name: "payment",
    patterns: [
      "الدفع", "ادفع", "فيزا", "تقسيط", "كاش", "عند الاستلام", "فودافون كاش",
      "payment", "pay", "instalment", "installment", "cash on delivery", "cod", "visa",
    ],
  },
  {
    name: "deals",
    patterns: [
      "خصم", "خصومات", "عروض", "عرض", "تخفيضات", "تخفيض", "اوفر", "اوكازيون",
      "sale", "deals", "offer", "offers", "discount", "promo",
    ],
  },
  {
    name: "product",
    patterns: [
      "متوفر", "موجود", "عندكم", "بكام", "السعر", "سعر", "مواصفات", "بديل",
      "عايز", "محتاج", "بدور علي", "بدور",
      "in stock", "available", "price", "how much", "do you have", "looking for",
    ],
  },
  {
    name: "greeting",
    patterns: ["السلام عليكم", "اهلا", "هاي", "مرحبا", "صباح الخير", "مساء الخير", "hi", "hello", "hey"],
  },
];

/** First intent whose wording is actually in the sentence. Order matters: a
 *  customer asking for a human has said so, whatever else the message mentions. */
const intentOf = (text) => {
  const t = normalize(text);
  for (const intent of INTENTS) {
    if (intent.patterns.some((p) => t.includes(normalize(p)))) return intent.name;
  }
  return null;
};

/* ──────────────────────────────── phrasing ──────────────────────────────── */

const say = (lang, ar, en) => (lang === "ar" ? ar : en);

const STATUS_TEXT = {
  pending: ["مستني التأكيد", "awaiting confirmation"],
  paid: ["مدفوع", "paid"],
  confirmed: ["اتأكد", "confirmed"],
  processing: ["بيتجهز", "being prepared"],
  shipped: ["اتشحن", "shipped"],
  out_for_delivery: ["مع المندوب", "out for delivery"],
  delivered: ["اتسلّم", "delivered"],
  cancelled: ["اتلغى", "cancelled"],
  refunded: ["اترد", "refunded"],
};

const statusText = (status, lang) => {
  const pair = STATUS_TEXT[status];
  if (!pair) return status;
  return lang === "ar" ? pair[0] : pair[1];
};

const egp = (n, lang) => (lang === "ar" ? `${n} جنيه` : `EGP ${n}`);

/** Where a link the assistant hands out has to point. */
const SITE_URL = (process.env.SITE_URL || "https://belgmla.com").replace(/\/+$/, "");

/**
 * The catalogue page, already filtered to the question that was asked.
 *
 * A chat message cannot hold 128 laptops, and a shortlist with nothing behind
 * it reads as the shop having four. This is the rest of the answer: the same
 * shelf, the same ceiling, cheapest first, on a page built to be scrolled.
 */
const catalogueLink = ({ query, budget, categoryId }) => {
  const params = new URLSearchParams();
  if (categoryId) params.set("category", categoryId);
  else if (query) params.set("search", query);
  if (budget) {
    // Rows with no price set would otherwise lead the list at zero.
    params.set("min", "1");
    params.set("max", String(budget));
  }
  params.set("sort", "price-low");
  return `${SITE_URL}/products?${params.toString()}`;
};

const describeOrder = (order, lang) => {
  const head = say(
    lang,
    `طلب #${order.reference} — ${statusText(order.status, lang)}`,
    `Order #${order.reference} — ${statusText(order.status, lang)}`
  );
  const lines = [head];

  if (order.items.length) {
    const names = order.items
      .map((i) => `${lang === "ar" && i.nameAr ? i.nameAr : i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`)
      .filter(Boolean);
    if (names.length) lines.push(names.join("، "));
  }

  lines.push(say(lang, `الإجمالي ${egp(order.total, "ar")}`, `Total ${egp(order.total, "en")}`));

  if (order.tracking) {
    lines.push(say(lang, `رقم التتبع: ${order.tracking}`, `Tracking: ${order.tracking}`));
  }
  if (order.delivered && order.deliveredAt) {
    const d = new Date(order.deliveredAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB");
    lines.push(say(lang, `اتسلّم يوم ${d}`, `Delivered on ${d}`));
  }

  return lines.join("\n");
};

/* ───────────────────────────── the rules engine ───────────────────────────── */

const needsAccount = (lang) => ({
  text: say(
    lang,
    "عشان أشوف طلبك محتاج تكون داخل بحسابك. سجّل دخولك وارجع لي، أو ابعتلي رقم الطلب وأنا أوصّلك لحد من الفريق.",
    "I need you signed in to look at your order. Sign in and come back, or give me the order number and I will pass you to someone on the team."
  ),
  suggestions: [
    { label: say(lang, "تسجيل الدخول", "Sign in"), action: "navigate", to: "/login" },
  ],
});

const answerOrder = async ({ text, user, lang }) => {
  if (!user) return needsAccount(lang);

  const quoted = referenceIn(text);
  if (quoted) {
    const order = await findOrder(user, quoted);
    if (order) return { text: describeOrder(order, lang), data: { order } };
    return {
      text: say(
        lang,
        `مالقيتش طلب برقم ${quoted} على حسابك. اتأكد من الرقم، أو أقولك على آخر طلباتك؟`,
        `I could not find order ${quoted} on your account. Check the number, or shall I list your recent orders?`
      ),
    };
  }

  const orders = await recentOrders(user, { limit: 3 });
  if (!orders.length) {
    return {
      text: say(
        lang,
        "مفيش طلبات على حسابك لسه.",
        "There are no orders on your account yet."
      ),
    };
  }

  const open = orders.filter((o) => !["delivered", "cancelled", "refunded"].includes(o.status));
  const shown = open.length ? open : orders.slice(0, 1);

  return {
    text: shown.map((o) => describeOrder(o, lang)).join("\n\n"),
    data: { orders: shown },
  };
};

/** Words people wrap a product question in, in both languages. */
const STOP_WORDS = new Set(
  [
    "متوفر", "متوفره", "موجود", "موجوده", "عندكم", "عندك", "بكام", "كام",
    "السعر", "سعر", "عايز", "عاوز", "محتاج", "بدور", "علي", "في", "هل", "من",
    "ايه", "ده", "دي", "لو", "سمحت", "المنتج", "منتج", "فيه",
    // How the question gets asked, which is never part of what is being asked
    // for. "هل يوجد هيكفيجين" was searching for a product called "هل يوجد".
    "يوجد", "متاح", "متاحه", "لديكم", "عندكو", "بتوفروا", "بتجيبوا",
    "in", "stock", "available", "price", "how", "much", "do", "you", "have",
    "looking", "for", "is", "the", "a", "an", "i", "want", "need", "any",
    /*
      What the thing is *for*. No row in the catalogue is named after the job it
      does, so "لابتوب للشغل" searched as two words is a laptop search with one
      word that can never match dragging the ranking down. Deliberately short:
      "جيمنج" and "العاب" stay in, because plenty of rows really are named that.
    */
    "للشغل", "شغل", "للمكتب", "للبيت", "للجامعه", "للدراسه", "دراسه", "للاستخدام",
    "كويس", "كويسه", "حلو", "حلوه", "احسن", "افضل", "مناسب", "مناسبه", "رخيص",
    "النهارده", "ممكن", "ياريت", "work", "office", "home", "school", "university",
    "good", "best", "better", "cheap", "cheapest", "today",
    // Asking about a discount says nothing about which product; no row is named
    // "خصم". Kept out of the search so "فيه خصم على الراوتر" searches a router.
    "خصم", "خصومات", "عروض", "عرض", "تخفيض", "تخفيضات", "اوفر",
  ].map((w) => normalizeArabic(w))
);

/*
  Words that are about the price rather than about the thing. None of them names
  a product, so they come out of the search either way.
*/
const MONEY_WORDS = new Set(
  [
    "حدود", "حوالي", "تحت", "اقل", "لحد", "ميزانيه", "ميزانيتي", "جنيه", "جنيها",
    "الف", "الاف", "under", "below", "max", "maximum", "budget", "egp", "le", "k",
  ].map((w) => normalizeArabic(w))
);

/*
  Units that make a number part of the product instead of part of the price.
  "كاميرا 4 ميجا حدود 3 الف" has to keep its 4 and lose its 3, and the only
  thing that tells them apart is the word that comes next.
*/
const SPEC_UNITS = new Set(
  [
    "ميجا", "ميغا", "جيجا", "جيغا", "تيرا", "بكسل", "بوصه", "انش", "وات", "فولت",
    "امبير", "متر", "سم", "مم", "ميجابكسل", "ساعه", "نواه", "كور",
    "mp", "gb", "tb", "mb", "hz", "ghz", "mhz", "khz", "w", "v", "ah", "va",
    "kva", "mm", "cm", "inch", "in", "mbps", "gbps", "g", "ac", "ax", "pro",
  ].map((w) => normalizeArabic(w))
);

const BUDGET_CUE = /(حدود|حوالي|تحت|اقل من|لحد|ميزانيه|ميزانيتي|في حدود|under|below|max|budget|up to)/;

const wordsOf = (text) =>
  normalize(text)
    .replace(/[?؟.,!]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * The ceiling in "لابتوب للشغل حدود 25 الف".
 *
 * A budget is the second half of most product questions here and it was going
 * into the search as if it were part of the name — so the words that mattered
 * were diluted by a number no row contains. Read it out, and the shortlist can
 * be cut to what the customer can actually afford instead of leading with the
 * most expensive thing that matched.
 *
 * "الف" and "k" are how the number is nearly always said; 25 on its own means
 * 25 pounds, which is nothing this shop sells, so a bare number under a
 * thousand is read as thousands too.
 *
 * A sentence can carry more than one number and only one of them is money.
 * "كاميرا 4 ميجا حدود 3 الف" holds a resolution and a ceiling — which is why
 * the word *after* each number is read: a number wearing a unit is a
 * specification and never a price, whichever of the two happens to be larger.
 */
const budgetIn = (text) => {
  const words = wordsOf(text);
  const hasCue = BUDGET_CUE.test(words.join(" "));

  const amounts = words
    .map((word, i) => {
      // "25 الف" and "25الف" are the same sentence typed by two people.
      const m = word.match(/^(\d[\d,]*)(الف|k)?$/);
      if (!m) return null;

      const raw = Number(m[1].replace(/,/g, ""));
      if (!Number.isFinite(raw) || raw <= 0) return null;

      const next = words[i + 1];
      const thousands = m[2] || (next === "الف" || next === "k" ? next : null);
      if (!thousands && next && SPEC_UNITS.has(next)) return null;

      if (thousands) return raw * 1000;
      if (!hasCue) return null;
      // A bare "25" after "حدود" is 25 thousand; nothing here costs 25 pounds.
      return raw < 1000 ? raw * 1000 : raw;
    })
    .filter(Boolean);

  return amounts.length ? Math.max(...amounts) : null;
};

/**
 * Take the money back out of the sentence before it becomes the search.
 *
 * Reading the ceiling was only half of it. "لابتوب للشغل حدود 25 الف" still went
 * to the catalogue as five words, and the text index matches *any* of them and
 * ranks by how many hit — so "حدود", "25" and "الف", which no row contains,
 * scored nothing while the one word that mattered was outvoted. The shortlist
 * came back led by a 69,599 EGP machine and the customer was told his budget
 * bought nothing.
 *
 * Only applied once a budget has actually been read, so a sentence with no
 * money in it searches exactly as it did before.
 */
const withoutTheBudget = (words) =>
  words.filter((word, i) => {
    if (MONEY_WORDS.has(word)) return false;
    // "25 الف" and "25الف" are the same sentence typed by two people.
    if (/^\d[\d,.]*(الف|k)$/.test(word)) return false;
    if (!/^\d[\d,.]*$/.test(word)) return true;
    const next = words[i + 1];
    return !!next && SPEC_UNITS.has(next);
  });

/*
  How many rows one answer carries. The channel splits a long reply into
  messages of its own accord, so this is about what a person will read in a chat
  window before scrolling past it — not about what fits.
*/
const LIST_SIZE = 12;

const answerProduct = async ({ text, lang, strict = false }) => {
  const budget = budgetIn(text);

  // The words that made this a product question are not part of the product's
  // name, and searching with them still in finds nothing.
  //
  // Filtered token by token rather than by a regex with `\b` around each word:
  // JavaScript's word boundary is defined against [A-Za-z0-9_], so every
  // Arabic letter counts as a non-word character and `\bعايز\b` matches almost
  // nowhere. The stop words were being left in, and the search was looking for
  // a product called "عايز شاشة msi".
  const words = wordsOf(text).filter((word) => !STOP_WORDS.has(word));
  const stripped = (budget ? withoutTheBudget(words) : words).join(" ");

  /*
    The ceiling goes to the database, not to a filter over the answer.

    Filtering afterwards only worked if something affordable happened to be in
    the first handful the index returned — ranked by how well the words matched,
    which has nothing to do with price. Ask for rows under the budget and every
    row that comes back is one the customer can buy.

    With a budget the question is "what can I get for this", which is a list and
    not a pick: the shelf is read cheapest first, as many as a chat message will
    carry, and the real count is said out loud with a link to the rest.
  */
  /*
    What the sentence actually named, before it is searched as words.

    Both are read on every product question, not only on the ones carrying a
    budget: "كاميرا ٢ ميجا هيكفيجن" has no ceiling and still has exactly one
    right answer, and it is the brand and the shelf that pick it out. Read from
    the shop's own tables — all 349 categories carry Arabic names, and the 444
    brands are matched by how they sound.
  */
  const [shelf, make] = await Promise.all([
    categoryFor(stripped || text),
    brandFor(stripped || text),
  ]);

  /*
    A make and nothing else is a question about the range, not about a product.

    Four products off a shelf of four hundred are not an answer to "do you carry
    Hikvision" — they are four arbitrary rows, and the first one that came back
    was an 86-inch whiteboard at 95,000. Naming the shelves the make actually
    fills hands the question back in a form the customer can finish.
  */
  if (make && !shelf && namesOnlyABrand(stripped || text, make)) {
    const shelves = await brandShelves(make, { limit: 5 });
    if (shelves.length) {
      const named = shelves.map((s) => (lang === "ar" && s.nameAr ? s.nameAr : s.name));
      return {
        text: say(
          lang,
          `عندنا كتير من ${make.name} — ${named.join("، ")}.\nبتدوّر على إيه بالظبط؟`,
          `We carry a lot of ${make.name} — ${named.join(", ")}.\nWhich one are you after?`
        ),
        suggestions: shelves.slice(0, 3).map((s, i) => ({
          label: named[i],
          action: "navigate",
          to: `/products?category=${s.id}`,
        })),
        data: { brand: make.name, shelves },
      };
    }
  }

  let { items: found, total } = await searchProducts(stripped || text, {
    limit: budget ? LIST_SIZE : 4,
    strict,
    maxPrice: budget || 0,
    sort: budget ? "price_asc" : null,
    category: shelf,
    brand: make,
    withTotal: true,
  });

  /*
    A shelf or a make read out of a sentence is a guess, and a guess that
    narrows to nothing must not be the final answer — the customer would be told
    the shop does not stock a thing it stocks. Ask again without them.
  */
  if (!found.length && (shelf || make)) {
    ({ items: found, total } = await searchProducts(stripped || text, {
      limit: budget ? LIST_SIZE : 4,
      strict,
      maxPrice: budget || 0,
      sort: budget ? "price_asc" : null,
      withTotal: true,
    }));
  }

  const affordable = budget
    ? found.filter((p) => (p.salePrice ?? p.price) <= budget)
    : found;

  // Nothing under the ceiling: ask again without it, so the shop can at least
  // say what the thing costs instead of pretending not to stock it.
  const nearest =
    budget && !affordable.length
      ? await searchProducts(stripped || text, { limit: 3, strict })
      : [];

  /*
    A budget nothing meets is worth saying out loud. Silently showing the
    cheapest thing over the line reads as the shop ignoring what was asked, and
    showing nothing at all hides that the item exists — so the ceiling is named
    and the closest few are offered anyway.
  */
  const overBudget = budget && !affordable.length && nearest.length;
  const hits = overBudget
    ? nearest.slice(0, 3)
    : affordable.slice(0, budget ? LIST_SIZE : 4);

  if (!hits.length) {
    if (strict) return null;
    return {
      text: say(
        lang,
        "مالقيتش حاجة بالاسم ده. اكتبلي الموديل أو الماركة وأنا أدوّر تاني.",
        "Nothing came up for that. Give me the model or the brand and I will look again."
      ),
    };
  }

  /*
    Say back what the question was taken to mean.

    A list of four cameras answers "كاميرا ٢ ميجا هيكفيجن" and a list of four
    cameras also answers a question it misread — and the customer cannot tell
    which from the products alone. Naming the shelf and the make turns a wrong
    reading into something correctable in one message instead of a customer who
    quietly decides the shop does not stock what he asked for.
  */
  const shelfName = shelf ? (lang === "ar" && shelf.nameAr ? shelf.nameAr : shelf.name) : "";
  const understood = shelf && make
    ? say(lang, `${shelfName} من ${make.name}`, `${shelfName} from ${make.name}`)
    : shelf
      ? shelfName
      : make
        ? say(lang, `منتجات ${make.name}`, `${make.name} products`)
        : "";

  const lines = hits.map((p) => {
    /*
      These names run to a hundred and thirty characters — every specification
      the supplier's sheet carried, in the row's name. Twelve of them with their
      links do not fit in a message the channel will send, so the tail that says
      the same thing as the line above it is dropped.
    */
    const full = lang === "ar" && p.nameAr ? p.nameAr : p.name;
    const name = full.length > 72 ? `${full.slice(0, 72).trimEnd()}…` : full;
    // A price of zero is a price nobody has set, not a machine being given away.
    const price = p.price > 0
      ? p.salePrice
        ? `${egp(p.salePrice, lang)}`
        : egp(p.price, lang)
      : say(lang, "السعر بيتأكد مع الفريق", "price confirmed by the team");
    /*
      Whether it is there, never how many.

      The count was going out to customers on every line, and it is the shop's
      own number — how much of a thing is on the shelf is what a competitor
      would price against and what a buyer would haggle with. It was not even
      true: ninety-three rows in a hundred read exactly 25 and the rest read 10,
      which is the figure the import wrote, not the figure in the warehouse. So
      the line carries the one number the customer asked for.
    */
    const stock = p.inStock
      ? say(lang, "متوفر", "in stock")
      : say(lang, "بيتجاب بالطلب", "ordered in");
    // The link belongs in the line. On a chat channel a name and a price the
    // customer cannot open is a dead end — they have to go and search the site
    // for the thing they were just shown.
    return `${name} — ${price} · ${stock}${p.url ? `\n${p.url}` : ""}`;
  });

  if (overBudget) {
    lines.unshift(
      say(
        lang,
        `مفيش حاجة تحت ${egp(budget, lang)} في اللي دوّرت عليه. أقرب حاجة:`,
        `Nothing came in under ${egp(budget, lang)} for that. The closest:`
      )
    );
  } else if (budget) {
    /*
      The rest of the list, without saying how long it is.

      How many of a thing the shop has — on the shelf or in the answer — is the
      shop's number and not the customer's, so no count appears in a reply. The
      total is still read, because it is what decides whether there is anything
      behind the twelve rows worth linking to; it just never reaches the page.
    */
    const more = (total || hits.length) > hits.length;

    lines.unshift(
      understood
        ? say(
            lang,
            `دي ${understood} اللي تحت ${egp(budget, lang)}، من الأرخص:`,
            `Here is the ${understood} under ${egp(budget, lang)}, cheapest first:`
          )
        : say(
            lang,
            `دي اللي عندنا تحت ${egp(budget, lang)}، من الأرخص:`,
            `Here is what we have under ${egp(budget, lang)}, cheapest first:`
          )
    );

    if (more) {
      const link = catalogueLink({
        query: stripped,
        budget,
        categoryId: shelf?.id || null,
      });
      lines.push(
        say(
          lang,
          `والليستة كاملة هنا، مرتّبة من الأرخص:\n${link}`,
          `And the complete list, cheapest first:\n${link}`
        )
      );
    }
  } else if (understood) {
    // No ceiling given, but the sentence still named a shelf or a make.
    lines.unshift(say(lang, `دي ${understood} اللي عندنا:`, `Here is the ${understood} we have:`));
  }

  return {
    text: lines.join("\n\n"),
    /*
      The chip goes to `/product/:id`, which is the route the app actually has.
      It was pointing at `/products/<slug>` — a plausible-looking URL for a page
      that does not exist, so every suggestion under every product answer landed
      the customer on a 404. Same id the link in the line above uses.
    */
    suggestions: hits.slice(0, 3).map((p) => ({
      label: lang === "ar" && p.nameAr ? p.nameAr : p.name,
      action: "navigate",
      to: `/product/${p.id}`,
    })),
    data: { products: hits },
  };
};

/**
 * "الشحن للاسكندرية بكام" is a question about Alexandria.
 *
 * `shippingFacts` has taken a governorate since it was written and nothing ever
 * passed one, so every customer got the national answer — the same paragraph
 * about the table existing, to someone who had already told us which row of it
 * he was standing in.
 */
const answerShipping = async ({ lang, text = "" }) => {
  const asked = await governorateIn(text);
  const s = await shippingFacts(asked);
  const parts = [];

  parts.push(
    say(
      lang,
      `التوصيل${s.zone ? ` لـ${s.zone}` : ""} بياخد من ${s.daysMin} لـ ${s.daysMax} أيام عمل.`,
      `Delivery${s.zone ? ` to ${s.zone}` : ""} takes ${s.daysMin}–${s.daysMax} working days.`
    )
  );

  /*
    The kill switch first, because everything below it is a price.

    `shippingFacts` reports `enabled`, and nothing here read it. With "Charge
    shipping" turned off, resolveShippingFee returns 0 and checkout charges
    nothing — while this went on quoting the configured default, or reading out
    the per-governorate table row by row. A customer told "Shipping is 75 EGP"
    who is then charged nothing is the harmless direction; the same bug quotes a
    stale table the day the switch is flipped for a promotion, and the shop is
    held to a number it is not charging.
  */
  if (!s.enabled) {
    parts.push(say(lang, "والشحن مجاني على كل الطلبات.", "Delivery is free on every order."));
    return { text: parts.join(" "), data: { shipping: s } };
  }

  /*
    One governorate asked about, one number given. The table is only read out to
    someone who did not say where they are.
  */
  if (s.zone) {
    parts.push(
      s.fee > 0
        ? say(
            lang,
            `مصاريف الشحن لـ${s.zone} ${egp(s.fee, lang)}.`,
            `Shipping to ${s.zone} is ${egp(s.fee, lang)}.`
          )
        : say(lang, `والشحن لـ${s.zone} مجاني.`, `Delivery to ${s.zone} is free.`)
    );
  } else if (s.zones.length) {
    const sample = s.zones.slice(0, 4).map((z) => `${z.governorate}: ${egp(z.fee, lang)}`);
    parts.push(
      say(
        lang,
        `مصاريف الشحن بتختلف بالمحافظة — ${sample.join("، ")}${s.zones.length > 4 ? "، وغيرها" : ""}.`,
        `Shipping depends on the governorate — ${sample.join(", ")}${s.zones.length > 4 ? ", and others" : ""}.`
      )
    );
  } else if (s.fee > 0) {
    parts.push(say(lang, `مصاريف الشحن ${egp(s.fee, lang)}.`, `Shipping is ${egp(s.fee, lang)}.`));
  } else {
    // A fee of zero is the shop saying delivery is free, not a price of zero
    // pounds — quoting the number back reads like a bug.
    parts.push(say(lang, "والشحن مجاني.", "Delivery is free."));
  }

  if (s.freeOver > 0) {
    parts.push(
      say(
        lang,
        `والشحن مجاني للطلبات من ${egp(s.freeOver, lang)} وفوق.`,
        `Orders of ${egp(s.freeOver, lang)} or more ship free.`
      )
    );
  }

  return { text: parts.join(" "), data: { shipping: s } };
};

const STATIC = {
  returns: [
    "عندك 3 أيام من الاستلام ترجّع المنتج وهو في حالته وبعلبته. تقدر تطلب الإرجاع من صفحة الطلب في حسابك، وإحنا نرتب الاستلام.",
    "You have 3 days from delivery to return an item in its original condition and box. Request the return from the order page in your account and we arrange the pickup.",
  ],
  warranty: [
    "كل المنتجات بضمان الوكيل، والمدة بتختلف حسب المنتج. قولّي اسم المنتج أو رقم الطلب وأنا أحوّلك لحد من الفريق يقولك المدة بالظبط ويفتحلك بلاغ لو فيه عطل.",
    "Everything we sell carries its agent's warranty, and the length depends on the product. Tell me the item or the order number and I will pass you to someone who can give you the exact period and open a service request if something is faulty.",
  ],
  payment: [
    "بتقدر تدفع كاش عند الاستلام، أو بالكارت، أو بالتقسيط.",
    "You can pay cash on delivery, by card, or in instalments.",
  ],
  greeting: [
    "أهلاً بيك في بالجملة. أقدر أساعدك في طلبك، أو في منتج بتدوّر عليه، أو في الشحن والإرجاع.",
    "Welcome to Belgomla. I can help with your order, with a product you are looking for, or with shipping and returns.",
  ],
};

const staticAnswer = (key, lang) => ({
  text: lang === "ar" ? STATIC[key][0] : STATIC[key][1],
});

const fallback = (lang) => ({
  /*
    A dead end is where these conversations are lost, so this says what to type
    next instead of only what went wrong. The examples are the shapes that do
    work — a product name, a name with a ceiling, a governorate — which is
    cheaper to read than a menu and teaches the customer the thing they need.
  */
  text: say(
    lang,
    [
      "مش متأكد إني فهمت 🙏 جرّب تكتبلي:",
      "• اسم المنتج — زي «راوتر tp-link» أو «كاميرا 4 ميجا»",
      "• أو المنتج وميزانيتك — «لابتوب حدود 25 الف»",
      "• أو «الشحن للاسكندرية بكام»",
      "",
      `والكتالوج كله هنا: ${SITE_URL}`,
      "ولو محتاج حد من الفريق قوللي وأنا أوصّلك.",
    ].join("\n"),
    [
      "I am not sure I followed that. Try one of these:",
      "• a product name — \"tp-link router\", \"4 MP camera\"",
      "• a product and a budget — \"laptop under 25k\"",
      "• or \"how much is shipping to Alexandria\"",
      "",
      `The full catalogue is here: ${SITE_URL}`,
      "And if you need someone from the team, say so and I will connect you.",
    ].join("\n")
  ),
  /*
    No `handoff` here, deliberately.

    This reply invites the customer to ask for a person — "قوللي وأنا أوصّلك".
    Flagging the invitation as a hand-off makes "I did not understand you"
    indistinguishable from "get me someone", and every caller that acts on the
    flag acts on the wrong one: the social inbox took a sentence it could not
    parse as its cue to stop answering that customer for good.

    A customer who takes the invitation lands on the `human` intent next turn,
    and that one does hand off.
  */
});

/**
 * "فيه خصومات النهارده؟"
 *
 * The shop keeps its reductions on one page and changes them often, so the
 * honest answer is the page rather than a list this file would have to be
 * redeployed to keep true.
 */
const answerDeals = (lang) => ({
  text: say(
    lang,
    `العروض والخصومات كلها هنا، وبتتحدث أول بأول:\n${SITE_URL}/deals\n\nولو بتدوّر على حاجة معينة قوللي اسمها وأنا أشوفلك سعرها.`,
    `Every current offer is on one page, kept up to date:\n${SITE_URL}/deals\n\nAnd if you are after something specific, tell me what it is and I will check the price.`
  ),
  data: { deals: `${SITE_URL}/deals` },
});

export const answerWithRules = async ({ text, user, lang = "ar" }) => {
  const intent = intentOf(text);

  switch (intent) {
    case "human":
      return {
        text: say(
          lang,
          "تمام، هوصّلك بحد من الفريق على واتساب ومعاه كلامنا ده كله.",
          "Of course — I will hand you to someone on the team on WhatsApp, with this conversation attached."
        ),
        handoff: true,
      };
    case "order":
      return answerOrder({ text, user, lang });
    case "product":
      return answerProduct({ text, lang });
    case "shipping":
      return answerShipping({ lang, text });
    case "deals": {
      /*
        "فيه خصم على الراوتر ده؟" is a question about the router. The row already
        carries its own sale price, which is a better answer than a page listing
        everything the shop has on offer — so the page is the fallback, not the
        first move.
      */
      if (namesAProduct(text)) {
        const named = await answerProduct({ text, lang });
        if (named?.data?.products?.length) return named;
      }
      return answerDeals(lang);
    }
    case "returns":
      return staticAnswer("returns", lang);
    case "warranty":
      return { ...staticAnswer("warranty", lang), handoff: true };
    case "payment":
      return staticAnswer("payment", lang);
    case "greeting":
      return staticAnswer("greeting", lang);
    default: {
      /*
        No framing words, but the sentence names something we sell — "لابتوب
        للشغل حدود 25 الف" is a product question wearing no question marks.
        Search it properly rather than as a guess: the customer told us what
        they want, they just did not phrase it as an enquiry.
      */
      /*
        An answer is products *or* the shelves of a make.

        This read `data.products.length` alone, and "هل يوجد هيكفيجين" — which
        answers with the range Hikvision covers rather than with four rows off
        it — carries no products at all. A correct answer was being computed and
        then thrown away for "I did not understand".
      */
      const answered = (reply) =>
        !!(reply?.data?.products?.length || reply?.data?.shelves?.length);

      if (namesAProduct(text)) {
        const named = await answerProduct({ text, lang });
        if (answered(named)) return named;
      }

      // Otherwise it may still be a bare product name. Guessed, though — so
      // the search is held to every word matching, and a guess that finds
      // nothing says nothing.
      if (normalize(text).length >= 3) {
        const guess = await answerProduct({ text, lang, strict: true });
        if (answered(guess)) return guess;
      }
      return fallback(lang);
    }
  }
};

/* ───────────────────────────── the model engine ───────────────────────────── */

const TOOL_SPECS = [
  {
    name: "recent_orders",
    description:
      "List the signed-in customer's recent orders with status, total and tracking. Returns an empty list when nobody is signed in.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "find_order",
    description:
      "Look up one of the signed-in customer's orders by the reference they quoted (the 8 characters shown on their orders page).",
    input_schema: {
      type: "object",
      properties: { reference: { type: "string" } },
      required: ["reference"],
    },
  },
  {
    name: "search_products",
    description:
      "Search the shop's catalogue by name, Arabic name or SKU. Returns price, sale price and stock.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "shipping_facts",
    description:
      "The shop's live shipping configuration: fee, per-governorate fees, free-shipping threshold and delivery window.",
    input_schema: {
      type: "object",
      properties: { governorate: { type: "string" } },
      required: [],
    },
  },
];

/**
 * `extras` is how a caller adds a tool of its own without this file learning
 * about it. The website assistant passes none; the social channels pass the
 * two that only make sense in a chat somebody can be handed out of — taking
 * an order down, and fetching a human.
 */
const runTool = async (name, input, user, extras = {}) => {
  switch (name) {
    case "recent_orders":
      return recentOrders(user, { limit: 5 });
    case "find_order":
      return (await findOrder(user, input?.reference)) || { found: false };
    case "search_products":
      return searchProducts(input?.query, { limit: 5 });
    case "shipping_facts":
      return shippingFacts(input?.governorate);
    default:
      break;
  }

  const extra = extras[name];
  if (typeof extra === "function") return extra(input || {});
  return { error: "unknown tool" };
};

/*
  What the shop itself does, as opposed to what it sells.

  A model that has been told to be helpful will answer "do you install?" with
  yes, because most shops do, and then a customer arrives expecting a fitter.
  Product knowledge can be reasoned about; a shop's own terms cannot. So the
  ones that come up are written down here as facts, and everything else is a
  question for the team.

  Confirmed by the owner, 5 September 2026. Change the lines here, not the
  prompt below.
*/
const SHOP_FACTS = [
  "The shop does install: cameras and networks are fitted by its own team, and the team agrees the date and the price with the customer.",
  "Trade and bulk pricing exists, and the sales team quotes it. Never state a percentage or a figure.",
  "Every product carries its agent's warranty. How long it runs depends on the "
    + "product and you do not know it: never name a number of years or months, "
    + "not even as a range or a guess. Say the warranty is the agent's and the "
    + "period depends on the item, then offer to have the team confirm it.",
  "Shipping, returns and payment are answered by the tools, not from memory.",
].join(" ");

const systemPrompt = (user, lang, extra = "") =>
  [
    "You are the support assistant for Belgomla, an Egyptian IT and networking shop.",
    "Shop facts come from the tools and nowhere else: a price, a stock level, a delivery time, a discount, an order status is whatever the tool returns. Never guess one, never round one, never describe a product the tools did not return. If a tool cannot answer a shop fact, say so plainly and offer to pass the customer to a person.",
    "General knowledge about the kit is yours to give, and you should give it. The difference between a DVR and an NVR, what PoE is for, what megapixels or IR range or colour night vision mean in practice, what a NAS does, how many cameras a shop of a given size usually needs, what to look for when choosing between two things — answer all of that from what you know, in a few plain sentences, the way someone behind the counter would. Do not say the information is unavailable: it is a technical question, not a catalogue lookup.",
    "When a technical question has a product behind it, answer the question first and then, if it helps, call a tool and name what the shop actually has.",
    `What the shop itself offers, you know only from this line and from the tools: ${SHOP_FACTS}`,
    "Anything else about how the shop operates — a service, a policy, a term, a timescale, a guarantee — you do not know and must not decide. Never answer such a question with yes or no. Say you will check with the team and offer to put the customer through. Inventing a service the shop does not run is the one mistake that reaches the counter.",
    lang === "ar"
      ? "Reply in Egyptian Arabic, the way a shop assistant in Cairo would speak — short, direct, no formal filler."
      : "Reply in English. Keep it short and direct.",
    user
      ? `The customer is signed in as ${user.name}. Order tools will only ever return their own orders.`
      : "Nobody is signed in, so no order can be looked up. If they ask about an order, ask them to sign in.",
    "Keep replies to a few lines. Do not use headings or bullet lists.",
    extra,
  ]
    .filter(Boolean)
    .join(" ");

/**
 * One call, then as many tool round-trips as the model asks for, capped so a
 * confused model cannot spend the shop's budget in a loop.
 */
const answerWithModel = async ({
  text,
  user,
  history = [],
  lang = "ar",
  extraTools = [],
  systemExtra = "",
}) => {
  const tools = [...TOOL_SPECS, ...extraTools.map((t) => t.spec)];
  const extras = Object.fromEntries(extraTools.map((t) => [t.spec.name, t.run]));

  const messages = [
    ...history.slice(-8).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 2000),
    })),
    { role: "user", content: String(text).slice(0, 2000) },
  ];

  for (let turn = 0; turn < 4; turn += 1) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: systemPrompt(user, lang, systemExtra),
        tools,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`model ${response.status}: ${await response.text()}`);
    }

    const body = await response.json();
    const toolUses = (body.content || []).filter((c) => c.type === "tool_use");

    if (!toolUses.length) {
      const said = (body.content || [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n")
        .trim();
      return { text: said || null, source: "model" };
    }

    messages.push({ role: "assistant", content: body.content });
    messages.push({
      role: "user",
      content: await Promise.all(
        toolUses.map(async (use) => ({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify(await runTool(use.name, use.input, user, extras)),
        }))
      ),
    });
  }

  // Four rounds of tool calls without an answer is a loop, not a hard question.
  return { text: null, source: "model" };
};

/**
 * The same conversation, spoken to Gemini.
 *
 * Same tools, same system prompt, same cap on rounds — only the wire format
 * differs, and the shapes are close enough that the translation is mechanical:
 * `input_schema` is already JSON Schema and becomes `parameters`, a tool call
 * arrives as a `functionCall` part instead of a `tool_use` block, and a result
 * goes back as a `functionResponse` part.
 *
 * Written to the free tier's grain. Google trains on free-tier traffic, so the
 * caller decides what may be sent — `answer` keeps order questions away from it
 * — and the rate limit is low enough that a failure here has to fall through to
 * the rules engine rather than become an apology to a customer.
 */
const answerWithGemini = async ({
  text,
  user,
  history = [],
  lang = "ar",
  extraTools = [],
  systemExtra = "",
}) => {
  const specs = [...TOOL_SPECS, ...extraTools.map((t) => t.spec)];
  const extras = Object.fromEntries(extraTools.map((t) => [t.spec.name, t.run]));

  // Gemini rejects an empty `properties`, which Anthropic accepts.
  const declarations = specs.map((spec) => {
    const shape = spec.input_schema || {};
    const declared = {
      name: spec.name,
      description: spec.description,
    };
    if (Object.keys(shape.properties || {}).length) {
      declared.parameters = {
        type: "object",
        properties: shape.properties,
        ...(shape.required?.length ? { required: shape.required } : {}),
      };
    }
    return declared;
  });

  const contents = [
    ...history.slice(-8).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 2000) }],
    })),
    { role: "user", parts: [{ text: String(text).slice(0, 2000) }] },
  ];

  const payload = () =>
    JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(user, lang, systemExtra) }] },
      contents,
      tools: [{ functionDeclarations: declarations }],
      generationConfig: { maxOutputTokens: 700, temperature: 0.3 },
    });

  /*
    Walk the model list until one answers. A retriable status gets one more go
    after a short wait — a 503 on the free tier is usually over in well under a
    second — and anything else moves straight to the next id. The whole budget
    is under two seconds of waiting, which a customer will not feel and a
    webhook will not time out on.
  */
  let chosen = null;
  const ask = async () => {
    let last = "gemini: no model configured";

    for (const model of chosen ? [chosen] : GEMINI_MODELS) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-goog-api-key": process.env.GEMINI_API_KEY,
            },
            body: payload(),
          }
        );

        if (response.ok) {
          chosen = model;
          return response;
        }

        last = `gemini ${response.status} (${model}): ${(await response.text()).slice(0, 200)}`;
        if (!GEMINI_RETRIABLE.has(response.status)) break;
        await pause(350 * (attempt + 1));
      }
    }

    throw new Error(last);
  };

  for (let turn = 0; turn < 4; turn += 1) {
    const response = await ask();

    const body = await response.json();
    const parts = body.candidates?.[0]?.content?.parts || [];
    const calls = parts.filter((p) => p.functionCall);

    if (!calls.length) {
      const said = parts
        .map((p) => p.text)
        .filter(Boolean)
        .join("\n")
        .trim();
      return { text: said || null, source: "gemini" };
    }

    contents.push({ role: "model", parts });
    contents.push({
      role: "user",
      parts: await Promise.all(
        calls.map(async ({ functionCall }) => ({
          functionResponse: {
            name: functionCall.name,
            // Gemini wants an object here, and a tool that returns an array —
            // every product search does — is not one.
            response: {
              result: await runTool(functionCall.name, functionCall.args, user, extras),
            },
          },
        }))
      ),
    });
  }

  return { text: null, source: "gemini" };
};

/* ───────────────────────────────── entry ───────────────────────────────── */

export const answer = async ({
  text,
  user,
  history,
  lang = "ar",
  extraTools = [],
  systemExtra = "",
}) => {
  /*
    An order question is answered here, never by a free model.

    Google trains on free-tier traffic. A customer asking for a product is
    asking about the catalogue and nothing of his own goes anywhere; a customer
    asking where his order is hands over a reference, a name and an address, and
    those are his, not ours to spend on somebody's training set. The rules
    engine has always answered order questions well — it reads the row and
    reports it — so on the free tier that is where they stay.

    With Claude's key configured the question does not arise: paid API traffic
    is not trained on, and the model answers everything.
  */
  const engine = hasClaude() ? answerWithModel : hasGemini() ? answerWithGemini : null;
  const theirs = !hasClaude() && intentOf(text) === "order";

  if (engine && !theirs) {
    try {
      const fromModel = await engine({
        text,
        user,
        history,
        lang,
        extraTools,
        systemExtra,
      });
      if (fromModel.text) {
        return { ...fromModel, handoff: false, suggestions: [] };
      }
    } catch (error) {
      // Logged, not surfaced: the customer gets the rules answer instead of an
      // apology about somebody else's API.
      console.error("support assistant model call failed:", error.message);
    }
  }

  const fromRules = await answerWithRules({ text, user, lang });
  return { suggestions: [], handoff: false, source: "rules", ...fromRules };
};

export default { answer, answerWithRules, hasModel, hasClaude, hasGemini };
