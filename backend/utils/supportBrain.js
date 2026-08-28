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
} from "./supportTools.js";

const MODEL = process.env.SUPPORT_MODEL || "claude-sonnet-5";
const hasModel = () => !!process.env.ANTHROPIC_API_KEY;

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
    "in", "stock", "available", "price", "how", "much", "do", "you", "have",
    "looking", "for", "is", "the", "a", "an", "i", "want", "need", "any",
  ].map((w) => normalizeArabic(w))
);

const answerProduct = async ({ text, lang, strict = false }) => {
  // The words that made this a product question are not part of the product's
  // name, and searching with them still in finds nothing.
  //
  // Filtered token by token rather than by a regex with `\b` around each word:
  // JavaScript's word boundary is defined against [A-Za-z0-9_], so every
  // Arabic letter counts as a non-word character and `\bعايز\b` matches almost
  // nowhere. The stop words were being left in, and the search was looking for
  // a product called "عايز شاشة msi".
  const stripped = normalize(text)
    .replace(/[?؟.,!]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word))
    .join(" ");

  const hits = await searchProducts(stripped || text, { limit: 4, strict });
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

  const lines = hits.map((p) => {
    const name = lang === "ar" && p.nameAr ? p.nameAr : p.name;
    const price = p.salePrice ? `${egp(p.salePrice, lang)}` : egp(p.price, lang);
    const stock = p.inStock
      ? say(lang, `متوفر (${p.stock})`, `in stock (${p.stock})`)
      : say(lang, "مش متوفر حالياً", "out of stock");
    return `${name} — ${price} · ${stock}`;
  });

  return {
    text: lines.join("\n"),
    suggestions: hits.slice(0, 3).map((p) => ({
      label: lang === "ar" && p.nameAr ? p.nameAr : p.name,
      action: "navigate",
      to: `/products/${p.slug}`,
    })),
    data: { products: hits },
  };
};

const answerShipping = async ({ lang }) => {
  const s = await shippingFacts();
  const parts = [];

  parts.push(
    say(
      lang,
      `التوصيل بياخد من ${s.daysMin} لـ ${s.daysMax} أيام عمل.`,
      `Delivery takes ${s.daysMin}–${s.daysMax} working days.`
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

  if (s.zones.length) {
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
    "كل المنتجات بضمان الوكيل المعتمد. قولّي رقم الطلب وإيه اللي حصل بالظبط، وأنا أحوّلك لحد من الفريق يفتحلك بلاغ صيانة.",
    "Everything we sell carries the manufacturer's warranty. Tell me the order number and what is happening, and I will pass you to someone who can open a service request.",
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
  text: say(
    lang,
    "مش متأكد إني فهمت. تقدر تسألني عن طلبك، أو عن منتج، أو عن الشحن والإرجاع — ولو محتاج حد من الفريق قوللي وأنا أوصّلك.",
    "I am not sure I followed that. You can ask me about your order, about a product, or about shipping and returns — and if you need someone from the team, say so and I will connect you."
  ),
  handoff: true,
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
      return answerShipping({ lang });
    case "returns":
      return staticAnswer("returns", lang);
    case "warranty":
      return { ...staticAnswer("warranty", lang), handoff: true };
    case "payment":
      return staticAnswer("payment", lang);
    case "greeting":
      return staticAnswer("greeting", lang);
    default: {
      // A sentence with no intent in it is often just a product name typed on
      // its own. Guessed, though — so the search is held to every word
      // matching, and a guess that finds nothing says nothing.
      if (normalize(text).length >= 3) {
        const guess = await answerProduct({ text, lang, strict: true });
        if (guess?.data?.products?.length) return guess;
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

const runTool = async (name, input, user) => {
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
      return { error: "unknown tool" };
  }
};

const systemPrompt = (user, lang) =>
  [
    "You are the support assistant for Belgomla, an Egyptian IT and networking shop.",
    "Answer only from the tools. Never invent a price, a stock level, a delivery time or an order status — call the tool and report what it returns.",
    "If the tools cannot answer, say so plainly and offer to pass the customer to a person.",
    lang === "ar"
      ? "Reply in Egyptian Arabic, the way a shop assistant in Cairo would speak — short, direct, no formal filler."
      : "Reply in English. Keep it short and direct.",
    user
      ? `The customer is signed in as ${user.name}. Order tools will only ever return their own orders.`
      : "Nobody is signed in, so no order can be looked up. If they ask about an order, ask them to sign in.",
    "Keep replies to a few lines. Do not use headings or bullet lists.",
  ].join(" ");

/**
 * One call, then as many tool round-trips as the model asks for, capped so a
 * confused model cannot spend the shop's budget in a loop.
 */
const answerWithModel = async ({ text, user, history = [], lang = "ar" }) => {
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
        system: systemPrompt(user, lang),
        tools: TOOL_SPECS,
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
          content: JSON.stringify(await runTool(use.name, use.input, user)),
        }))
      ),
    });
  }

  // Four rounds of tool calls without an answer is a loop, not a hard question.
  return { text: null, source: "model" };
};

/* ───────────────────────────────── entry ───────────────────────────────── */

export const answer = async ({ text, user, history, lang = "ar" }) => {
  if (hasModel()) {
    try {
      const fromModel = await answerWithModel({ text, user, history, lang });
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

export default { answer, answerWithRules, hasModel };
