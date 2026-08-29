import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";
import { useMoney } from "../../lib/money";
import type { Category } from "../../types/category.type";

/**
 * Who is in the deals window, and at what discount.
 *
 * `/deals` shows every product whose `saleActive` is on, but nothing in the
 * dashboard put a product in there or took it out. The only controls were the
 * per-product edit form — one product at a time, across a catalogue of sixteen
 * thousand — and a blunt "switch everything off" on the Sales page. Running a
 * campaign meant editing rows by hand, so nobody ran one, and what sat in the
 * window instead was seeded noise: discounts spread evenly across every
 * percentage from 1 to 100, a product at 100% off selling for nothing.
 *
 * So this page is the missing middle: pick a set, give the set one number, and
 * the window is what you chose rather than what a migration left behind.
 *
 * Nothing here is new machinery. `PUT /products/bulk-update` already accepted
 * `saleActive` and `salePercentage` on a list of ids and already refused
 * anything outside its whitelist; it simply had no caller. Adding, removing and
 * repricing are all the same request with a different body, which is why they
 * behave identically and why a failure leaves the catalogue in one state rather
 * than half of two.
 *
 * Two guards are deliberate:
 *
 * `audience=public` on the search. The electronics branch is a separate section
 * with its own page and its own decisions, and a deals campaign that quietly
 * swept it in would be the one mistake nobody would notice until an order came
 * through. It is excluded at the query, not filtered out afterwards, so it
 * cannot arrive in the first place.
 *
 * The ceiling. The shop's rule is that no product is discounted more than 13%,
 * and a rule that lives only in someone's memory is not a rule. Typing more
 * than the ceiling is possible — a real campaign may need it — but it takes a
 * deliberate second action and says plainly what it is doing, which is the
 * difference between a decision and a slip.
 */

const CEILING = 13;

interface Row {
  _id: string;
  name: string;
  nameAr?: string;
  price: number;
  salePercentage: number;
  saleActive: boolean;
  sku?: string;
  category?: string | { _id: string; name: string; nameAr?: string };
}

interface Page {
  data: Row[];
  total: number;
  page: number;
  pages: number;
}

const EMPTY: Page = { data: [], total: 0, page: 1, pages: 1 };

const categoryName = (row: Row, ar: boolean): string => {
  const c = row.category;
  if (!c || typeof c === "string") return "";
  return (ar && c.nameAr) || c.name || "";
};

const DealsManagerPage: React.FC = () => {
  const { i18n } = useTranslation();
  const money = useMoney();
  const ar = i18n.language === "ar";

  const [tab, setTab] = useState<"in" | "add">("in");
  const [busy, setBusy] = useState(false);

  // ── what is in the window right now ──────────────────────────
  const [inDeals, setInDeals] = useState<Page>(EMPTY);
  const [inPage, setInPage] = useState(1);
  const [inLoading, setInLoading] = useState(true);

  // ── the search, for putting more in ──────────────────────────
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [found, setFound] = useState<Page>(EMPTY);
  const [foundPage, setFoundPage] = useState(1);
  const [foundLoading, setFoundLoading] = useState(false);

  // ── selection and the number to apply ────────────────────────
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [percentage, setPercentage] = useState(CEILING);
  const [overrideCeiling, setOverrideCeiling] = useState(false);

  const overCeiling = percentage > CEILING;

  // Selection belongs to the list it was made in. Carrying it across the tabs
  // would let a "remove" act on rows the person picked while looking at the
  // search results, which are a different set of products entirely.
  const switchTab = (next: "in" | "add") => {
    setPicked(new Set());
    setTab(next);
  };

  const loadInDeals = useCallback(async () => {
    setInLoading(true);
    try {
      const { data } = await axiosInstance.get("/products/saleProducts", {
        params: { page: inPage, limit: 50 },
      });
      setInDeals({
        data: data?.data ?? [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        pages: data?.pages ?? 1,
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          (ar ? "مش قادر أقرا العروض" : "Could not read the deals")
      );
    } finally {
      setInLoading(false);
    }
  }, [inPage, ar]);

  useEffect(() => {
    loadInDeals();
  }, [loadInDeals]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get("/categories/tree");
        const flat: Category[] = [];
        const walk = (nodes: any[], depth: number) => {
          for (const n of nodes || []) {
            flat.push({ ...n, name: `${"— ".repeat(depth)}${n.name}` });
            if (n.children?.length) walk(n.children, depth + 1);
          }
        };
        walk(data?.data ?? data ?? [], 0);
        setCategories(flat);
      } catch {
        // A missing category list costs the filter, not the page.
      }
    })();
  }, []);

  // Typing is not a query. Without this every keystroke is a round trip and the
  // answers come back out of order, so the list flickers between two searches.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search.trim());
      setFoundPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const runSearch = useCallback(async () => {
    if (!debounced && !categoryId) {
      setFound(EMPTY);
      return;
    }
    setFoundLoading(true);
    try {
      const { data } = await axiosInstance.get("/products", {
        params: {
          page: foundPage,
          limit: 50,
          audience: "public", // the electronics branch is not ours to sweep in
          ...(debounced ? { search: debounced } : {}),
          ...(categoryId ? { categoryId } : {}),
        },
      });
      setFound({
        data: data?.data ?? [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        pages: data?.pages ?? 1,
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          (ar ? "البحث مانفعش" : "That search did not work")
      );
    } finally {
      setFoundLoading(false);
    }
  }, [debounced, categoryId, foundPage, ar]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const rows = tab === "in" ? inDeals : found;
  const loading = tab === "in" ? inLoading : foundLoading;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allShown = rows.data.length > 0 && rows.data.every((r) => picked.has(r._id));
  const toggleAll = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (allShown) rows.data.forEach((r) => next.delete(r._id));
      else rows.data.forEach((r) => next.add(r._id));
      return next;
    });

  /** Add, remove and reprice are one request with a different body. */
  const apply = async (updateData: Record<string, unknown>, done: string) => {
    const ids = Array.from(picked);
    if (!ids.length) return;
    setBusy(true);
    try {
      const { data } = await axiosInstance.put("/products/bulk-update", {
        ids,
        updateData,
      });
      toast.success(`${done} — ${Number(data?.modifiedCount ?? 0).toLocaleString()}`);
      setPicked(new Set());
      await loadInDeals();
      if (tab === "add") await runSearch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || (ar ? "مانفعش" : "That did not work"));
    } finally {
      setBusy(false);
    }
  };

  const addToDeals = () =>
    apply(
      { saleActive: true, salePercentage: percentage },
      ar ? `اتضافوا للعروض بخصم ${percentage}%` : `Added at ${percentage}%`
    );

  const removeFromDeals = () =>
    apply({ saleActive: false }, ar ? "اتشالوا من العروض" : "Removed from deals");

  const reprice = () =>
    apply(
      { salePercentage: percentage },
      ar ? `الخصم بقى ${percentage}%` : `Discount set to ${percentage}%`
    );

  const summary = useMemo(() => {
    const list = inDeals.data.reduce((s, r) => s + (r.price || 0), 0);
    const given = inDeals.data.reduce(
      (s, r) => s + (r.price || 0) * ((r.salePercentage || 0) / 100),
      0
    );
    const over = inDeals.data.filter((r) => (r.salePercentage || 0) > CEILING).length;
    return { list, given, over };
  }, [inDeals]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-start gap-3">
        <TagIcon className="w-7 h-7 text-[var(--brand-accent,#00A8E8)] shrink-0" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {ar ? "إدارة العروض" : "Deals"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {ar
              ? "اللي في صفحة العروض، ونسبة الخصم بتاعته. اختار مجموعة وحدّد رقم واحد ليها."
              : "What sits on the deals page, and at what discount. Pick a set, give it one number."}
          </p>
        </div>
      </div>

      {/* The window as it stands. Read before changing. */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          [ar ? "في العروض (الصفحة دي)" : "In deals (this page)", inDeals.data.length.toLocaleString()],
          [ar ? "إجمالي العروض" : "Deals total", inDeals.total.toLocaleString()],
          [ar ? "قيمتهم بسعر القائمة" : "List value", money(summary.list)],
          [ar ? "المتنازل عنه" : "Given away", money(summary.given)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {summary.over > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
          <p className="text-sm text-amber-900">
            {ar
              ? `${summary.over} منتج في الصفحة دي خصمه فوق ${CEILING}%. اختارهم واضغط «غيّر الخصم» عشان ينزلوا للسقف.`
              : `${summary.over} products on this page are discounted above ${CEILING}%. Select them and use "Set discount" to bring them to the ceiling.`}
          </p>
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        {([
          ["in", ar ? "اللي في العروض" : "In deals"],
          ["add", ar ? "ضيف منتجات" : "Add products"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === key
                ? "border-[var(--brand-accent,#00A8E8)] text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "add" && (
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              className={`w-5 h-5 text-gray-400 absolute top-2.5 ${ar ? "right-3" : "left-3"}`}
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "دوّر باسم المنتج أو الكود" : "Search by name or SKU"}
              className={`w-full rounded-xl border border-gray-300 py-2 text-sm ${
                ar ? "pr-10 pl-3" : "pl-10 pr-3"
              }`}
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setFoundPage(1);
            }}
            className="rounded-xl border border-gray-300 py-2 px-3 text-sm sm:w-72"
          >
            <option value="">{ar ? "كل الأقسام" : "All categories"}</option>
            {categories.map((c: any) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* The bar only exists when it has something to act on. */}
      {picked.size > 0 && (
        <div className="mt-4 sticky top-2 z-10 rounded-2xl border border-gray-300 bg-white shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-900">
              {ar ? `${picked.size} متحددين` : `${picked.size} selected`}
            </span>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">{ar ? "الخصم" : "Discount"}</label>
              <input
                type="number"
                min={1}
                max={overrideCeiling ? 100 : CEILING}
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                className="w-20 rounded-lg border border-gray-300 py-1.5 px-2 text-sm tabular-nums"
                dir="ltr"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>

            <button
              onClick={tab === "add" ? addToDeals : reprice}
              disabled={busy || percentage < 1 || (overCeiling && !overrideCeiling)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent,#00A8E8)] text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {busy ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : tab === "add" ? (
                <PlusCircleIcon className="w-4 h-4" aria-hidden="true" />
              ) : (
                <CheckIcon className="w-4 h-4" aria-hidden="true" />
              )}
              {tab === "add"
                ? ar
                  ? "ضيف للعروض"
                  : "Add to deals"
                : ar
                ? "غيّر الخصم"
                : "Set discount"}
            </button>

            {tab === "in" && (
              <button
                onClick={removeFromDeals}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                <MinusCircleIcon className="w-4 h-4" aria-hidden="true" />
                {ar ? "شيل من العروض" : "Remove from deals"}
              </button>
            )}

            <button
              onClick={() => setPicked(new Set())}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              {ar ? "إلغاء التحديد" : "Clear"}
            </button>
          </div>

          {/* Said out loud, because it is the shop's own rule being crossed. */}
          {overCeiling && (
            <label className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-300 p-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={overrideCeiling}
                onChange={(e) => setOverrideCeiling(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-amber-900">
                {ar
                  ? `${percentage}% فوق سقف الـ ${CEILING}%. علّم هنا لو ده مقصود.`
                  : `${percentage}% is above the ${CEILING}% ceiling. Tick this if that is deliberate.`}
              </span>
            </label>
          )}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">
            <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto mb-2" aria-hidden="true" />
            {ar ? "بيحمّل…" : "Loading…"}
          </div>
        ) : rows.data.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            {tab === "in"
              ? ar
                ? "مفيش منتجات في العروض دلوقتي."
                : "No products are in deals right now."
              : ar
              ? "دوّر باسم أو اختار قسم عشان تلاقي منتجات تضيفها."
              : "Search or pick a category to find products to add."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3 w-10">
                  <input type="checkbox" checked={allShown} onChange={toggleAll} />
                </th>
                <th className={`p-3 font-medium ${ar ? "text-right" : "text-left"}`}>
                  {ar ? "المنتج" : "Product"}
                </th>
                <th className="p-3 font-medium whitespace-nowrap">{ar ? "السعر" : "Price"}</th>
                <th className="p-3 font-medium whitespace-nowrap">{ar ? "الخصم" : "Discount"}</th>
                <th className="p-3 font-medium whitespace-nowrap">{ar ? "بيتباع بـ" : "Sells for"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((r) => {
                const pct = r.saleActive ? r.salePercentage || 0 : 0;
                const sells = (r.price || 0) * (1 - pct / 100);
                const hot = pct > CEILING;
                return (
                  <tr
                    key={r._id}
                    onClick={() => toggle(r._id)}
                    className={`border-t border-gray-100 cursor-pointer ${
                      picked.has(r._id) ? "bg-sky-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={picked.has(r._id)}
                        onChange={() => toggle(r._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-3">
                      <p className="text-gray-900 line-clamp-1">{(ar && r.nameAr) || r.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[r.sku, categoryName(r, ar)].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="p-3 tabular-nums whitespace-nowrap text-gray-700" dir="ltr">
                      {money(r.price)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {pct > 0 ? (
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            hot ? "text-red-600" : "text-emerald-700"
                          }`}
                          dir="ltr"
                        >
                          −{pct}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 tabular-nums whitespace-nowrap font-medium text-gray-900" dir="ltr">
                      {money(sells)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {rows.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => (tab === "in" ? setInPage((p) => p - 1) : setFoundPage((p) => p - 1))}
            disabled={rows.page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {ar ? "السابق" : "Previous"}
          </button>
          <span className="text-sm text-gray-600 tabular-nums">
            {rows.page} / {rows.pages}
          </span>
          <button
            onClick={() => (tab === "in" ? setInPage((p) => p + 1) : setFoundPage((p) => p + 1))}
            disabled={rows.page >= rows.pages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {ar ? "التالي" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
};

export default DealsManagerPage;
