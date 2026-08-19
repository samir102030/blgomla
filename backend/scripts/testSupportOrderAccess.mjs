/**
 * Does the assistant's order access hold?
 *
 * The tools are the only thing standing between a customer asking "where is my
 * order" and the shop's whole order book, and only the signed-out path had
 * been exercised. This drives the two functions directly with real user
 * documents — no login, no credentials — and asks the question that matters:
 * given one customer's reference, does another customer's session get it back?
 *
 * The shop has no orders yet, so two are written straight into the collection
 * and removed again at the end. They are inserted raw rather than through the
 * model because the tools only ever read user, items, status, total and
 * tracking; building a schema-valid order would drag in an address and a store
 * and prove nothing extra. Everything written here carries a marker and is
 * deleted in a finally block, including when an assertion throws.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const { recentOrders, findOrder } = await import("./utils/supportTools.js");
const User = (await import("./models/user.model.js")).default;

const MARK = "__assistant_boundary_test__";
const db = mongoose.connection.db;
const orders = db.collection("orders");
const users = db.collection("users");

let failures = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m) => {
  failures += 1;
  console.log(`  FAIL  ${m}`);
};

const madeUsers = [];
const madeOrders = [];

try {
  // Two customers. Real ones if the shop has them, throwaways if not.
  let picked = await User.find({ role: "customer" }).limit(2).select("-password");

  if (picked.length < 2) {
    const docs = ["A", "B"].map((tag) => ({
      name: `${MARK} ${tag}`,
      email: `${MARK}.${tag.toLowerCase()}@example.invalid`,
      role: "customer",
      active: true,
      marker: MARK,
    }));
    const inserted = await users.insertMany(docs);
    madeUsers.push(...Object.values(inserted.insertedIds));
    picked = await User.find({ _id: { $in: madeUsers } }).select("-password");
  }

  const [a, b] = picked;
  console.log(`customer A: ${a.name}\ncustomer B: ${b.name}\n`);

  // One order each, so the crossover has something real to fail against.
  for (const [owner, total] of [
    [a, 1250],
    [b, 4800],
  ]) {
    const { insertedId } = await orders.insertOne({
      user: owner._id,
      orderItems: [{ quantity: 1, price: total }],
      status: "processing",
      totalPrice: total,
      isDelivered: false,
      trackingNumber: null,
      marker: MARK,
      createdAt: new Date(2026, 0, 1),
      updatedAt: new Date(2026, 0, 1),
    });
    madeOrders.push(insertedId);
  }

  const aOrders = await recentOrders(a, { limit: 5 });
  const bOrders = await recentOrders(b, { limit: 5 });

  // 1. Each customer sees their own.
  aOrders.length ? pass(`A sees ${aOrders.length} order(s) of their own`) : fail("A sees none of their own");

  const aIds = new Set(
    (await orders.find({ user: a._id }).project({ _id: 1 }).toArray()).map((o) => String(o._id))
  );
  aOrders.every((o) => aIds.has(o.id))
    ? pass("every order A was shown belongs to A")
    : fail("A was shown an order that is not theirs");

  // 2. A quoting one of their own references gets that order back.
  const mine = aOrders[0];
  const found = await findOrder(a, mine.reference);
  found?.id === mine.id ? pass("A finds their own order by its reference") : fail("A cannot find their own order");

  // 3. The one that matters.
  const bRef = bOrders[0].reference;
  const crossover = await findOrder(a, bRef);
  crossover === null
    ? pass(`A asking for B's reference ${bRef} gets nothing`)
    : fail(`A was shown B's order: ${JSON.stringify(crossover).slice(0, 140)}`);

  // 4. Lower case, and with a # in front, the way a person would paste it.
  (await findOrder(a, `#${bRef.toLowerCase()}`)) === null
    ? pass("the same reference pasted as #lowercase is still refused")
    : fail("case or a # got past the ownership check");

  // 5. Nobody signed in.
  (await recentOrders(null)).length === 0 ? pass("a visitor sees no orders") : fail("a visitor was shown orders");
  (await findOrder(null, mine.reference)) === null
    ? pass("a visitor quoting a real reference gets nothing")
    : fail("a visitor was shown an order");

  // 6. A made-up reference matches nothing.
  (await findOrder(a, "00000000")) === null
    ? pass("a made-up reference finds nothing")
    : fail("a made-up reference matched an order");
} finally {
  if (madeOrders.length) await orders.deleteMany({ _id: { $in: madeOrders } });
  if (madeUsers.length) await users.deleteMany({ _id: { $in: madeUsers } });
  const left = (await orders.countDocuments({ marker: MARK })) + (await users.countDocuments({ marker: MARK }));
  console.log(`\ncleanup: ${madeOrders.length} order(s) and ${madeUsers.length} user(s) removed, ${left} left behind`);
  await mongoose.disconnect();
  process.exitCode = failures ? 1 : 0;
}
