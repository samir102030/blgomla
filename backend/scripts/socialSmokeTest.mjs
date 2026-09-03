/**
 * Smoke test for the social AI channels.
 *
 * Drives the whole path a real message takes — signed webhook, parse,
 * de-duplication, thread, model call, tool call, outgoing send — over real
 * HTTP against the real app, with only two things faked: the network out to
 * Anthropic and Meta, and (unless you point it at a database) the storage.
 *
 *   node --experimental-test-module-mocks scripts/socialSmokeTest.mjs
 *
 * With a real Mongo, which also exercises the catalogue search and the
 * product links it hands the model:
 *
 *   MONGO_URI=mongodb://localhost:27017/blgomla-test \
 *     node --experimental-test-module-mocks scripts/socialSmokeTest.mjs
 */
import crypto from "crypto";
import { mock } from "node:test";

const USE_REAL_DB = !!process.env.MONGO_URI;

const APP_SECRET = "test-app-secret";
process.env.META_APP_SECRET = APP_SECRET;
process.env.META_VERIFY_TOKEN = "test-verify-token";
process.env.ANTHROPIC_API_KEY = "test-key";
process.env.WHATSAPP_PHONE_NUMBER_ID = "111222333";
process.env.WHATSAPP_TOKEN = "test-wa-token";
process.env.IG_ACCOUNT_ID = "ig-999";
process.env.IG_TOKEN = "test-ig-token";
process.env.FB_PAGE_ID = "page-777";
process.env.FB_PAGE_TOKEN = "test-page-token";
process.env.SITE_URL = "https://belgmla.com";
process.env.JWT_SECRET = "test-jwt";
process.env.NODE_ENV = "test";
delete process.env.SOCIAL_ALERT_WHATSAPP; // no alert noise in the send log

const here = (p) => new URL(p, import.meta.url).href;

/* ─────────────────────────── storage, faked ─────────────────────────── */

const stores = {};

if (!USE_REAL_DB) {
  let seq = 0;
  const oid = (p) => `${p}${(seq += 1).toString().padStart(6, "0")}`;

  class ThreadDoc {
    constructor(init) {
      Object.assign(
        this,
        {
          _id: oid("thread"),
          channel: "",
          externalId: "",
          accountId: "",
          displayName: "",
          phone: "",
          user: null,
          history: [],
          seenMessageIds: [],
          status: "bot",
          handoffReason: "",
          handoffAt: null,
          lang: "ar",
          messageCount: 0,
          lastInboundAt: null,
          lastOutboundAt: null,
        },
        init
      );
    }
    brainHistory(limit = 10) {
      return this.history
        .slice(-limit)
        .map((t) => ({ role: t.role === "user" ? "user" : "assistant", content: t.content }));
    }
    async save() {
      return this;
    }
  }

  const match = (doc, filter) =>
    Object.entries(filter).every(([k, v]) => String(doc[k]) === String(v));

  const threads = [];
  stores.threads = threads;
  const SocialThread = {
    async findOneAndUpdate(filter, update) {
      let doc = threads.find((d) => match(d, filter));
      if (!doc) {
        doc = new ThreadDoc({ ...(update.$setOnInsert || {}) });
        threads.push(doc);
      }
      Object.assign(doc, update.$set || {});
      return doc;
    },
    async findOne(filter) {
      return threads.find((d) => match(d, filter)) || null;
    },
  };

  const leads = [];
  stores.leads = leads;
  const SocialLead = {
    async create(data) {
      const doc = { _id: oid("lead"), status: "new", ...data };
      leads.push(doc);
      return doc;
    },
    async findOne(filter) {
      return leads.find((d) => match(d, filter)) || null;
    },
    async countDocuments() {
      return leads.length;
    },
  };

  mock.module(here("../models/socialThread.model.js"), { defaultExport: SocialThread });
  mock.module(here("../models/socialLead.model.js"), { defaultExport: SocialLead });
  mock.module(here("../config/db.js"), { defaultExport: async () => ({}) });

  // notifyTeam reaches for these; with no database they would throw into its
  // catch and print noise that hides a real failure.
  mock.module(here("../models/notification.model.js"), {
    defaultExport: { insertMany: async () => [] },
  });
  mock.module(here("../models/user.model.js"), {
    defaultExport: {
      find: () => ({ select: () => ({ limit: () => ({ lean: async () => [] }) }) }),
    },
  });

  // The catalogue, stubbed at the same boundary the real tool returns —
  // including the finished product link, which is what the model pastes.
  const CATALOGUE = [
    {
      id: "6600aa11bb22cc33dd44ee55",
      name: "Hikvision DS-2CD1043G2 4MP IP Camera",
      nameAr: "كاميرا هيك فيجن 4 ميجا",
      slug: "hikvision-ds-2cd1043g2-ee55",
      url: "https://belgmla.com/product/6600aa11bb22cc33dd44ee55",
      brand: "Hikvision",
      price: 2400,
      salePrice: null,
      inStock: true,
      stock: 12,
      image: null,
    },
  ];
  mock.module(here("../utils/supportTools.js"), {
    namedExports: {
      normalizeArabic: (t) => String(t || "").toLowerCase(),
      orderReference: (id) => String(id).slice(-8).toUpperCase(),
      referenceIn: () => null,
      recentOrders: async () => [],
      findOrder: async () => null,
      searchProducts: async (q) =>
        /hik|كاميرا|camera/i.test(String(q || "")) ? CATALOGUE : [],
      shippingFacts: async () => ({ fee: 60, freeOver: 5000, days: "2-4" }),
    },
  });
}

/* ───────────────────────────── network, faked ───────────────────────────── */

const sent = [];
const modelCalls = [];
let modelScript = [];

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  if (href.startsWith("http://127.0.0.1")) return realFetch(url, init);

  const body = init.body ? JSON.parse(init.body) : {};

  if (href.includes("api.anthropic.com")) {
    modelCalls.push(body);
    const next = modelScript.shift();
    if (!next) throw new Error("model script exhausted — an unexpected extra call");
    return new Response(JSON.stringify(next), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (href.includes("graph.facebook.com") || href.includes("graph.instagram.com")) {
    sent.push({ url: href, body });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.sent" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  throw new Error(`unexpected outbound call: ${href}`);
};

/* ──────────────────────────────── harness ──────────────────────────────── */

const { default: app } = await import("../app.js");

let mongoose;
let Product;
let seededProduct = null;
if (USE_REAL_DB) {
  mongoose = (await import("mongoose")).default;
  const { default: connectDB } = await import("../config/db.js");
  await connectDB();
  Product = (await import("../models/product.model.js")).default;
  const SocialThread = (await import("../models/socialThread.model.js")).default;
  const SocialLead = (await import("../models/socialLead.model.js")).default;
  await Promise.all([
    SocialThread.deleteMany({}),
    SocialLead.deleteMany({}),
    Product.deleteMany({ sku: "HIK-1043" }),
  ]);
  seededProduct = await Product.create({
    name: "Hikvision DS-2CD1043G2 4MP IP Camera",
    nameAr: "كاميرا هيك فيجن 4 ميجا",
    price: 2400,
    stock: 12,
    sku: "HIK-1043",
    approvalStatus: "approved",
  });
}

const readThread = async (filter) =>
  USE_REAL_DB
    ? (await import("../models/socialThread.model.js")).default.findOne(filter)
    : stores.threads.find((d) =>
        Object.entries(filter).every(([k, v]) => String(d[k]) === String(v))
      ) || null;

const readLead = async (filter) =>
  USE_REAL_DB
    ? (await import("../models/socialLead.model.js")).default.findOne(filter)
    : stores.leads.find((d) =>
        Object.entries(filter).every(([k, v]) => String(d[k]) === String(v))
      ) || null;

const countLeads = async () =>
  USE_REAL_DB
    ? (await import("../models/socialLead.model.js")).default.countDocuments()
    : stores.leads.length;

const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;

const post = async (path, payload, { sign = true } = {}) => {
  const raw = JSON.stringify(payload);
  const headers = { "content-type": "application/json" };
  if (sign) {
    headers["x-hub-signature-256"] =
      "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(raw).digest("hex");
  }
  return realFetch(`${base}${path}`, { method: "POST", headers, body: raw });
};

/**
 * The webhook answers 200 before it has done anything, so a test that reads
 * `sent` immediately reads it too early. Wait until two consecutive ticks see
 * no new model call and no new send — a fixed sleep raced the reply.
 */
const settle = async (quietTicks = 3, tick = 60) => {
  let quiet = 0;
  let seen = `${sent.length}:${modelCalls.length}`;
  while (quiet < quietTicks) {
    await new Promise((r) => setTimeout(r, tick));
    const now = `${sent.length}:${modelCalls.length}`;
    quiet = now === seen ? quiet + 1 : 0;
    seen = now;
  }
};

let failures = 0;
const check = (name, condition, detail = "") => {
  if (condition) console.log(`  ✅ ${name}`);
  else {
    failures += 1;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

/** Real outgoing messages only — a WhatsApp read receipt POSTs to the same URL. */
const outbound = (match = () => true) =>
  sent.filter((s) => s.body?.status !== "read").filter(match);

const say = (text) => ({ content: [{ type: "text", text }], stop_reason: "end_turn" });
const useTool = (name, input) => ({
  content: [{ type: "tool_use", id: `tu_${name}`, name, input }],
  stop_reason: "tool_use",
});
const lastToolResult = () => {
  const call = modelCalls.at(-1);
  const turn = call?.messages?.find(
    (m) => Array.isArray(m.content) && m.content[0]?.type === "tool_result"
  );
  return JSON.parse(turn?.content?.[0]?.content || "null");
};

const waMessage = (from, text, id, extra = {}) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { phone_number_id: "111222333" },
            contacts: [{ wa_id: from, profile: { name: "سمير" } }],
            messages: [
              { from, id, timestamp: "1", type: "text", text: { body: text }, ...extra },
            ],
          },
        },
      ],
    },
  ],
});

console.log(`\nStorage: ${USE_REAL_DB ? "real MongoDB" : "in-memory fakes"}`);

/* ──────────────────────────────── tests ──────────────────────────────── */

console.log("\n1. Webhook verification");
{
  const ok = await realFetch(
    `${base}/api/social/webhook/meta?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=CHAL123`
  );
  check("echoes the challenge for the right token", (await ok.text()) === "CHAL123");
  const bad = await realFetch(
    `${base}/api/social/webhook/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=CHAL123`
  );
  check("refuses the wrong token", bad.status === 403, `got ${bad.status}`);
}

console.log("\n2. Signature enforcement");
{
  const res = await post("/api/social/webhook/meta", waMessage("201001234567", "هاي", "m0"), {
    sign: false,
  });
  check("an unsigned POST is rejected", res.status === 403, `got ${res.status}`);
  await settle();
  check("and nothing was said on our number", outbound().length === 0, `${outbound().length} sends`);

  const tampered = JSON.stringify(waMessage("201001234567", "هاي", "m0"));
  const wrong = await realFetch(`${base}/api/social/webhook/meta`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": "sha256=" + "0".repeat(64),
    },
    body: tampered,
  });
  check("a forged signature is rejected", wrong.status === 403, `got ${wrong.status}`);
}

console.log("\n3. WhatsApp question → catalogue tool → reply");
{
  modelScript = [
    useTool("search_products", { query: "hikvision camera" }),
    say("عندنا كاميرا هيك فيجن 4 ميجا بـ 2400 جنيه ومتوفرة."),
  ];
  const res = await post(
    "/api/social/webhook/meta",
    waMessage("201001234567", "عندكم كاميرا هيكفيجن؟", "m1")
  );
  check("the webhook is acknowledged at once", res.status === 200, `got ${res.status}`);
  await settle();

  const wa = outbound((s) => s.url.includes("111222333/messages") && s.body.type === "text");
  check("one WhatsApp reply went out", wa.length === 1, `${wa.length}`);
  check("to the customer who wrote", wa[0]?.body.to === "201001234567");
  check("carrying the price", String(wa[0]?.body.text?.body || "").includes("2400"));
  check("with link previews off", wa[0]?.body.text?.preview_url === false);

  const result = lastToolResult();
  check("the catalogue tool answered the model", !!result?.[0]?.name, JSON.stringify(result));
  const expectedUrl = USE_REAL_DB
    ? `https://belgmla.com/product/${seededProduct._id}`
    : "https://belgmla.com/product/6600aa11bb22cc33dd44ee55";
  check("and handed it a finished product link", result?.[0]?.url === expectedUrl, result?.[0]?.url);

  const thread = await readThread({ channel: "whatsapp", externalId: "201001234567" });
  check("a thread was opened", !!thread);
  check("holding both turns", thread?.history.length === 2, `${thread?.history.length}`);
  check("and the customer's name", thread?.displayName === "سمير");
  check("still owned by the bot", thread?.status === "bot", thread?.status);
}

console.log("\n4. Redelivery of a message already answered");
{
  const before = outbound().length;
  modelScript = [];
  const res = await post(
    "/api/social/webhook/meta",
    waMessage("201001234567", "عندكم كاميرا هيكفيجن؟", "m1")
  );
  check("still acknowledged", res.status === 200);
  await settle();
  check("but answered only once", outbound().length === before, `${outbound().length - before} extra`);
}

console.log("\n5. Taking an order down");
{
  modelScript = [
    useTool("capture_order", {
      items: [{ label: "كاميرا هيك فيجن 4 ميجا", sku: "HIK-1043", quantity: 2, quotedPrice: 2400 }],
      customerName: "سمير",
      phone: "201001234567",
      governorate: "القاهرة",
      address: "المعادي",
    }),
    say("تمام، سجلت طلبك. زميلي هيكلمك يأكد التوفر والسعر النهائي."),
  ];
  await post("/api/social/webhook/meta", waMessage("201001234567", "عايز اتنين، ابعتهملي المعادي", "m2"));
  await settle();

  const lead = await readLead({ externalId: "201001234567" });
  check("a lead was filed", !!lead);
  check("with both units", lead?.items?.[0]?.quantity === 2, String(lead?.items?.[0]?.quantity));
  check("and an estimate", lead?.estimatedTotal === 4800, String(lead?.estimatedTotal));
  check("marked new, not an order", lead?.status === "new");
}

console.log("\n6. Refusing to file an empty order");
{
  const before = await countLeads();
  modelScript = [
    useTool("capture_order", { items: [] }),
    say("محتاج أعرف الأول المنتج اللي محتاجه."),
  ];
  await post("/api/social/webhook/meta", waMessage("201009999999", "عايز اطلب", "m3"));
  await settle();
  check("no lead was created", (await countLeads()) === before);
  check("and the model was told why", lastToolResult()?.saved === false, JSON.stringify(lastToolResult()));
}

console.log("\n7. Refusing to file an order with no way to call back");
{
  // On WhatsApp the sender id is the phone number, so a lead there always has
  // a way to call back and is right to be filed. Instagram is where the guard
  // bites: a scoped id is not a contact.
  const before = await countLeads();
  modelScript = [
    useTool("capture_order", { items: [{ label: "كاميرا", quantity: 1 }] }),
    say("تمام — ممكن رقم تليفونك عشان نأكد الطلب؟"),
  ];
  await post("/api/social/webhook/meta", {
    object: "instagram",
    entry: [
      {
        id: "ig-999",
        messaging: [
          { sender: { id: "igsid-77" }, recipient: { id: "ig-999" }, message: { mid: "ig-order", text: "عايز كاميرا" } },
        ],
      },
    ],
  });
  await settle();
  check("no lead was filed", (await countLeads()) === before);
  check("because there is no phone and no address", /phone/.test(lastToolResult()?.reason || ""), lastToolResult()?.reason);

  // And the same order on WhatsApp, where the number is known, does file.
  modelScript = [
    useTool("capture_order", { items: [{ label: "كاميرا", quantity: 1 }] }),
    say("سجلت طلبك، هنكلمك نأكد."),
  ];
  await post("/api/social/webhook/meta", waMessage("201008888888", "عايز كاميرا", "m3b"));
  await settle();
  check("but on WhatsApp it does, using the sender's own number", !!(await readLead({ externalId: "201008888888" })));
}

console.log("\n8. Handing over to a person");
{
  modelScript = [
    useTool("request_human", { reason: "شكوى في أوردر قديم" }),
    say("آسف على ده. حد من الفريق هيرد عليك هنا حالاً."),
  ];
  await post("/api/social/webhook/meta", waMessage("201005555555", "عايز اكلم حد، الأوردر متأخر", "m4"));
  await settle();

  const thread = await readThread({ externalId: "201005555555" });
  check("the thread is marked for a human", thread?.status === "human", thread?.status);
  check("with the reason kept for the team", !!thread?.handoffReason);

  const before = outbound().length;
  modelScript = [];
  await post("/api/social/webhook/meta", waMessage("201005555555", "في حد؟", "m5"));
  await settle();
  check("the bot then stays quiet", outbound().length === before, `${outbound().length - before} sends`);

  const after = await readThread({ externalId: "201005555555" });
  check("but keeps recording what is said", after?.history.length === 3, `${after?.history.length}`);
}

console.log("\n9. Instagram, through the same brain");
{
  const before = outbound((s) => s.url.includes("ig-999/messages")).length;
  modelScript = [say("أهلاً بيك! بتدور على إيه؟")];
  await post("/api/social/webhook/meta", {
    object: "instagram",
    entry: [
      {
        id: "ig-999",
        messaging: [
          { sender: { id: "igsid-42" }, recipient: { id: "ig-999" }, message: { mid: "ig1", text: "هاي" } },
        ],
      },
    ],
  });
  await settle();

  const ig = outbound((s) => s.url.includes("ig-999/messages"));
  check("an Instagram reply went out", ig.length === before + 1, `${ig.length - before}`);
  check("to the right person", ig.at(-1)?.body.recipient?.id === "igsid-42");
  check("on its own thread", !!(await readThread({ channel: "instagram", externalId: "igsid-42" })));
}

console.log("\n10. Messenger, and our own echo");
{
  modelScript = [say("أهلاً! تحت أمرك.")];
  await post("/api/social/webhook/meta", {
    object: "page",
    entry: [
      {
        id: "page-777",
        messaging: [
          { sender: { id: "psid-7" }, recipient: { id: "page-777" }, message: { mid: "fb1", text: "مساء الخير" } },
        ],
      },
    ],
  });
  await settle();
  check("Messenger got a reply", outbound().at(-1)?.url.includes("page-777/messages"));
  check("marked as a response to them", outbound().at(-1)?.body.messaging_type === "RESPONSE");

  const before = outbound().length;
  modelScript = [];
  await post("/api/social/webhook/meta", {
    object: "page",
    entry: [
      {
        id: "page-777",
        messaging: [
          {
            sender: { id: "page-777" },
            recipient: { id: "psid-7" },
            message: { mid: "fb2", text: "أهلاً! تحت أمرك.", is_echo: true },
          },
        ],
      },
    ],
  });
  await settle();
  check("our own echo is not answered", outbound().length === before, `${outbound().length - before}`);
}

console.log("\n11. A voice note");
{
  modelScript = [];
  await post("/api/social/webhook/meta", {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "111222333" },
              contacts: [{ wa_id: "201007777777", profile: { name: "عميل" } }],
              messages: [{ from: "201007777777", id: "v1", type: "audio", audio: { id: "a1" } }],
            },
          },
        ],
      },
    ],
  });
  await settle();
  const reply = outbound().at(-1)?.body?.text?.body || "";
  check("we said we cannot open it", reply.includes("مش قادر أفتحها"), reply.slice(0, 50));
  check("without spending a model call", modelCalls.at(-1)?.messages?.at(-1)?.content !== "[audio]");
  const thread = await readThread({ externalId: "201007777777" });
  check("and a person was fetched", thread?.status === "human", thread?.status);
}

console.log("\n12. Delivery receipts are not messages");
{
  const before = outbound().length;
  modelScript = [];
  const res = await post("/api/social/webhook/meta", {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "111222333" },
              statuses: [{ id: "wamid.sent", status: "delivered", recipient_id: "201001234567" }],
            },
          },
        ],
      },
    ],
  });
  check("acknowledged", res.status === 200);
  await settle();
  check("nothing answered", outbound().length === before);
}

console.log("\n13. Long replies are split, not truncated");
{
  const { chunk } = await import("../utils/socialChannels.js");
  const long = Array.from(
    { length: 40 },
    (_, i) => `سطر رقم ${i} فيه كلام كتير عن منتج معين وسعره وتفاصيله`
  ).join("\n\n");
  const parts = chunk(long, 950);
  check("split into several parts", parts.length > 1, `${parts.length}`);
  check("each within the platform's limit", parts.every((p) => p.length <= 950));
  check("nothing lost in the split", parts.join("").replace(/\s+/g, "") === long.replace(/\s+/g, ""));
  check("a short reply is left alone", chunk("سعرها 2400 جنيه", 950).length === 1);
}

console.log("\n14. The website assistant is unchanged");
{
  // supportBrain grew an `extraTools` argument. The site's own assistant does
  // not pass one, and must still be handed exactly the four tools it had.
  const { answer } = await import("../utils/supportBrain.js");
  modelScript = [say("الشحن ٦٠ جنيه ويوصل في ٢-٤ أيام.")];
  const before = modelCalls.length;
  const result = await answer({ text: "الشحن بكام؟", user: null, history: [], lang: "ar" });
  const call = modelCalls[before];
  const names = (call?.tools || []).map((t) => t.name);
  check("still exactly the four original tools", names.length === 4, names.join(","));
  check(
    "and the same ones",
    ["recent_orders", "find_order", "search_products", "shipping_facts"].every((n) => names.includes(n)),
    names.join(",")
  );
  check("no chat-only instruction leaked into the site prompt", !/messaging app/.test(call?.system || ""));
  check("and it answered", !!result.text);

  // Where the social path does pass them, they are added, not swapped in.
  const socialCall = modelCalls.find((c) => (c.tools || []).some((t) => t.name === "capture_order"));
  const socialNames = (socialCall?.tools || []).map((t) => t.name);
  check("the chat path gets six", socialNames.length === 6, socialNames.join(","));
  check("keeping the original four", socialNames.includes("search_products") && socialNames.includes("shipping_facts"));
  check("and its own prompt", /messaging app/.test(socialCall?.system || ""));
}

console.log("\n15. Status endpoint");
{
  const body = await (await realFetch(`${base}/api/social/status`)).json();
  check(
    "reports the wired channels",
    body.channels.whatsapp && body.channels.instagram && body.channels.messenger
  );
  check("and the unwired one", body.channels.tiktok === false);
  check("and that signing is configured", body.signing === true);
}

/* ─────────────────────────────── teardown ─────────────────────────────── */

console.log(`\n${failures ? "❌" : "✅"} ${failures ? `${failures} check(s) failed` : "all checks passed"}\n`);

server.close();
if (USE_REAL_DB) await mongoose.disconnect();
process.exit(failures ? 1 : 0);
