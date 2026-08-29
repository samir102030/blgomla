import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  Square3Stack3DIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";
import { useMoney } from "../../lib/money";

/**
 * Everything that discounts a product, in one place.
 *
 * The pieces existed; none of them could be pointed at more than one product.
 * `salePercentage` and `saleActive`, the `saleStartsAt`/`saleEndsAt` window the
 * scheduler cron reads, and the `bulkPricing` ladder were all fields on the
 * edit modal, so a campaign across a hundred products was a hundred modals and
 * nobody ran one. What sat in the window instead was seeded noise: percentages
 * spread evenly across every integer from 1 to 100, a product at 100% off
 * selling for nothing.
 *
 * So the page is not a new discount system. It is the missing plural: pick a
 * set, give the set one number, one window, or one ladder.
 *
 * Everything goes through `PUT /products/bulk-update`, which already refused
 * anything outside its whitelist and already ran as one `updateMany`. Adding,
 * removing, repricing, scheduling and laddering are that one request with a
 * different body — which is why they behave identically, and why a failure
 * leaves the catalogue in one state rather than half of two.
 *
 * Three guards are deliberate.
 *
 * `audience=public` on the search. The electronics branch is a separate section
 * with its own page and its own decisions; a campaign that quietly swept it in
 * would be the mistake nobody notices until an order arrives. It is excluded at
 * the query, so it cannot arrive rather than being filtered out afterwards.
 *
 * The ceiling. The shop's rule is that nothing is discounted more than 13%, and
 * a rule that lives only in someone's memory is not a rule. Exceeding it is
 * possible, because a real campaign might need to, but it takes a second
 * deliberate action that says out loud what it is doing.
 *
 * The ceiling sweep hands back the old percentages before it changes them.
 * `bulk-update` has no snapshot of its own, so the only record of what a sweep
 * overwrote is the one taken here — offered as a file, because a number in a
 * toast that has scrolled away is not a record.
 */

const CEILING = 13;
const PAGE = 50;

type Tab = "in" | "add";
type Mode = "percent" | "window" | "ladder";

interface Row {
  _id: string;
  name: string;
  nameAr?: string;
  price: number;
  salePercentage: number;
  saleActive: boolean;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  sku?: string;
  category?: string | { _id: string; name: string; nameAr?: string };
}

interface Paged {
  data: Row[];
  total: number;
  page: number;
  pages: number;
}

interface Audit {
  onSale: number;
  listValue: number;
  discount: number;
  halfOrMore: number;
  bands: Record<string, number>;
}

interface Tier {
  minQty: string;
  unitPrice: string;
}

const EMPTY: Paged = { data: [], total: 0, page: 1, pages: 1 };

const asPage = (d: any): Paged => ({
  data: d?.data ?? [],
  total: d?.total ?? 0,
  page: d?.page ?? 1,
  pages: d?.pages ?? 1,
});

const categoryOf = (r: Row, ar: boolean): string => {
  const c = r.category;
  if (!c || typeof c === "string") return "";
  return (ar && c.nameAr) || c.name || "";
};

const DealsManagerPage: React.FC = () => {
  const { i18n } = useTranslation();
  const money = useMoney();
  const ar = i18n.language === "ar";

  const [tab, setTab] = useState<Tab>("in");
  const [mode, setMode] = useState<Mode>("percent");
  const [busy, setBusy] = useState(false);

  const [audit, setAudit] = useState<Audit | null>(null);
  const [inDeals, setInDeals] = useState<Paged>(EMPTY);
  const [inPage, setInPage] = useState(1);
  const [inLoading, setInLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [found, setFound] = useState<Paged>(EMPTY);
  const [foundPage, setFoundPage] = useState(1);
  const [foundLoading, setFoundLoading] = useState(false);

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [percentage, setPercentage] = useState(CEILING);
  const [overrideCeiling, setOverrideCeiling] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([{ minQty: "10", unitPrice: "" }]);

  const [ceiling, setCeiling] = useState(CEILING);
  const [sweeping, setSweeping] = useState(false);
  const [picking, setPicking] = useState(false);

  const overCeiling = percentage > CEILING;

  const loadAudit = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/products/sales/audit");
      setAudit(data);
    } catch {
      // The report is context, not a prerequisite. Losing it should not take
      // the controls down with it.
    }
  }, []);

  const loadInDeals = useCallback(async () => {
    setInLoading(true);
    try {
      const { data } = await axiosInstance.get("/products/saleProducts", {
        params: { page: inPage, limit: PAGE },
      });
      setInDeals(asPage(data));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || (ar ? "مش قادر أقرا العروض" : "Could not read the deals"));
    } finally {
      setInLoading(false);
    }
  }, [inPage, ar]);

  useEffect(() => {
    loadInDeals();
  }, [loadInDeals]);
  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get("/categories/tree");
        // This endpoint answers `{ success, tree }`, not the `{ data }` the
        // paginated listings use. Read for the wrong key and the walk below
        // gets an object instead of an array, throws, and the catch turns a
        // shape mismatch into an empty dropdown that looks like a shop with no
        // categories. The other spellings stay as fallbacks, not as guesses.
        const roots = data?.tree ?? data?.data ?? (Array.isArray(data) ? data : []);
        if (!Array.isArray(roots)) throw new Error("categories/tree did not return a list");

        const flat: any[] = [];
        const walk = (nodes: any[], depth: number) => {
          for (const n of nodes || []) {
            // The electronics branch is excluded from the search by
            // `audience=public`, so listing it here would offer a filter that
            // can only ever come back empty.
            if (n.sectionKey === "electronics") continue;
            const label = (ar && n.nameAr) || n.name;
            flat.push({ _id: n._id, name: `${"— ".repeat(depth)}${label}` });
            if (n.children?.length) walk(n.children, depth + 1);
          }
        };
        walk(roots, 0);
        setCategories(flat);
      } catch (e) {
        // Losing the filter should not take the page down — but it should not
        // be silent either. Silence is what let the wrong key ship.
        console.error("Deals: could not build the category filter", e);
        toast.error(ar ? "فلتر الأقسام مش متاح" : "The category filter is unavailable");
      }
    })();
  }, [ar]);

  // Typing is not a query. Without this every keystroke is a round trip and the
  // answers arrive out of order, so the list flickers between two searches.
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
          limit: PAGE,
          audience: "public", // the electronics branch is not ours to sweep in
          ...(debounced ? { search: debounced } : {}),
          ...(categoryId ? { categoryId } : {}),
        },
      });
      setFound(asPage(data));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || (ar ? "البحث مانفعش" : "That search did not work"));
    } finally {
      setFoundLoading(false);
    }
  }, [debounced, categoryId, foundPage, ar]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const rows = tab === "in" ? inDeals : found;
  const loading = tab === "in" ? inLoading : foundLoading;

  // Selection belongs to the list it was made in. Carried across the tabs, a
  // "remove" would act on rows picked while looking at search results, which
  // are a different set of products entirely.
  const switchTab = (next: Tab) => {
    setPicked(new Set());
    setTab(next);
  };

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

  /**
   * Select every row the current view matches, not just the page on screen.
   *
   * The header checkbox ticks what is rendered, which is fifty rows. Someone
   * clearing a campaign of four hundred products reads that as "select all",
   * presses remove, watches the number fall by fifty, and does it again —
   * except the pages behind it never come into view, so the count walks down in
   * fifty-sized steps and never reaches the end. The set the operator means is
   * the whole result, so this walks it.
   */
  const selectAllMatching = async () => {
    setPicking(true);
    try {
      const ids: string[] = [];
      for (let p = 1; p <= 200; p++) {
        const { data } =
          tab === "in"
            ? await axiosInstance.get("/products/saleProducts", { params: { page: p, limit: 100 } })
            : await axiosInstance.get("/products", {
                params: {
                  page: p,
                  limit: 100,
                  audience: "public",
                  ...(debounced ? { search: debounced } : {}),
                  ...(categoryId ? { categoryId } : {}),
                },
              });
        ids.push(...(data?.data ?? []).map((r: Row) => r._id));
        if (p >= (data?.pages ?? 1)) break;
      }
      setPicked(new Set(ids));
      toast.success(ar ? `${ids.length} متحددين` : `${ids.length} selected`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || (ar ? "مانفعش" : "That did not work"));
    } finally {
      setPicking(false);
    }
  };

  /**
   * Every mutation on this page is this one request with a different body.
   *
   * Sent in chunks, because the selection is no longer bounded by what fits on
   * a page: a whole-catalogue selection in a single body is a request big
   * enough for a proxy to refuse, and the refusal would land after the operator
   * had already been told the work was under way.
   */
  const apply = async (updateData: Record<string, unknown>, done: string) => {
    const ids = Array.from(picked);
    if (!ids.length) return;
    setBusy(true);
    try {
      let changed = 0;
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await axiosInstance.put("/products/bulk-update", {
          ids: ids.slice(i, i + 200),
          updateData,
        });
        changed += data?.modifiedCount ?? 0;
      }
      toast.success(`${done} — ${changed.toLocaleString()}`);
      setPicked(new Set());
      await Promise.all([loadInDeals(), loadAudit()]);
      if (tab === "add") await runSearch();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || (ar ? "مانفعش" : "That did not work"));
    } finally {
      setBusy(false);
    }
  };

  const applyPercent = () =>
    tab === "add"
      ? apply(
          { saleActive: true, salePercentage: percentage },
          ar ? `اتضافوا بخصم ${percentage}%` : `Added at ${percentage}%`
        )
      : apply(
          { salePercentage: percentage },
          ar ? `الخصم بقى ${percentage}%` : `Discount set to ${percentage}%`
        );

  const removeFromDeals = () =>
    apply({ saleActive: false }, ar ? "اتشالوا من العروض" : "Removed from deals");

  const applyWindow = () => {
    if (!startsAt && !endsAt) {
      toast.error(ar ? "حدد تاريخ واحد على الأقل" : "Set at least one date");
      return;
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      toast.error(ar ? "النهاية لازم تكون بعد البداية" : "The end has to come after the start");
      return;
    }
    apply(
      {
        saleStartsAt: startsAt ? new Date(startsAt).toISOString() : null,
        saleEndsAt: endsAt ? new Date(endsAt).toISOString() : null,
        salePercentage: percentage,
      },
      ar ? "المواعيد اتظبطت" : "Sale window set"
    );
  };

  const clearWindow = () =>
    apply({ saleStartsAt: null, saleEndsAt: null }, ar ? "المواعيد اتشالت" : "Sale window cleared");

  const applyLadder = () => {
    const clean = tiers
      .filter((t) => t.minQty !== "" && t.unitPrice !== "")
      .map((t) => ({ minQty: Number(t.minQty), unitPrice: Number(t.unitPrice) }));
    if (!clean.length) {
      toast.error(ar ? "ضيف درجة واحدة على الأقل" : "Add at least one tier");
      return;
    }
    if (clean.some((t) => !(t.minQty >= 1) || !(t.unitPrice > 0))) {
      toast.error(ar ? "الكمية من 1 والسعر أكبر من صفر" : "Quantity from 1, price above zero");
      return;
    }
    if (new Set(clean.map((t) => t.minQty)).size !== clean.length) {
      toast.error(ar ? "مينفعش كميتين متكررتين" : "Two tiers cannot share a quantity");
      return;
    }
    apply({ bulkPricing: clean }, ar ? "سلّم الجملة اتظبط" : "Quantity ladder set");
  };

  const clearLadder = () =>
    apply({ bulkPricing: [] }, ar ? "سلّم الجملة اتشال" : "Quantity ladder cleared");

  /**
   * Bring everything above the ceiling down to it.
   *
   * Reads every discounted product first, so the sweep knows exactly what it is
   * about to overwrite and can hand that back as a file. `bulk-update` keeps no
   * before-image of its own; this is the only one there will be.
   */
  const sweepCeiling = async () => {
    setSweeping(true);
    try {
      const all: Row[] = [];
      for (let p = 1; p <= 50; p++) {
        const { data } = await axiosInstance.get("/products/saleProducts", {
          params: { page: p, limit: 100 },
        });
        all.push(...(data?.data ?? []));
        if (p >= (data?.pages ?? 1)) break;
      }
      const over = all.filter((r) => (r.salePercentage || 0) > ceiling);
      if (!over.length) {
        toast.success(ar ? `مفيش منتج فوق ${ceiling}%` : `Nothing is above ${ceiling}%`);
        return;
      }

      // Written out before anything changes, so a sweep that goes wrong has
      // something to go back to.
      const backup = over.map((r) => ({ id: r._id, was: r.salePercentage, name: r.name }));
      const blob = new Blob([JSON.stringify(backup, null, 1)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sale-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      let changed = 0;
      for (let i = 0; i < over.length; i += 200) {
        const slice = over.slice(i, i + 200).map((r) => r._id);
        const { data } = await axiosInstance.put("/products/bulk-update", {
          ids: slice,
          updateData: { salePercentage: ceiling },
        });
        changed += data?.modifiedCount ?? 0;
      }
      toast.success(
        ar ? `${changed} منتج نزلوا لـ ${ceiling}%` : `${changed} products brought to ${ceiling}%`
      );
      await Promise.all([loadInDeals(), loadAudit()]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || (ar ? "الكنس مانفعش" : "The sweep did not work"));
    } finally {
      setSweeping(false);
    }
  };

  const overOnPage = useMemo(
    () => inDeals.data.filter((r) => (r.salePercentage || 0) > CEILING).length,
    [inDeals]
  );

  const bandRows = audit ? Object.entries(audit.bands) : [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-start gap-3">
        <TagIcon className="w-7 h-7 text-[var(--brand-accent,#00A8E8)] shrink-0" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {ar ? "إدارة العروض والخصومات" : "Deals and discounts"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {ar
              ? "اختار مجموعة منتجات، وادّيها خصم واحد أو مواعيد واحدة أو سلّم جملة واحد."
              : "Pick a set of products and give it one discount, one window, or one ladder."}
          </p>
        </div>
      </div>

      {/* What the shop is discounting right now. Read before changing. */}
      {audit && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              [ar ? "منتج عليه خصم" : "On sale", audit.onSale.toLocaleString()],
              [ar ? "نص السعر أو أقل" : "Half price or less", audit.halfOrMore.toLocaleString()],
              [ar ? "قيمتهم بسعر القائمة" : "List value", money(audit.listValue)],
              [ar ? "المتنازل عنه" : "Given away", money(audit.discount)],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-gray-200 p-3">
                <p className="text-lg font-semibold text-gray-900 tabular-nums">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* The shape is the argument: an even spread across every band is not
              a pricing decision, it is noise. */}
          {bandRows.length > 0 && audit.onSale > 0 && (
            <ul className="mt-4 space-y-1">
              {bandRows.map(([band, n]) => (
                <li key={band} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-gray-500 w-16 shrink-0" dir="ltr">
                    {band}%
                  </span>
                  <span
                    className="h-2 rounded-full bg-amber-400/70"
                    style={{ width: `${Math.min((n / audit.onSale) * 260, 260)}px` }}
                  />
                  <span className="text-xs text-gray-500 tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}

          {/* The ceiling, as a control rather than a convention. */}
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 p-4">
            <ArrowTrendingDownIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
            <span className="text-sm text-gray-800">
              {ar ? "نزّل أي خصم فوق" : "Bring every discount above"}
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={ceiling}
              onChange={(e) => setCeiling(Number(e.target.value))}
              className="w-20 rounded-lg border border-gray-300 py-1.5 px-2 text-sm tabular-nums"
              dir="ltr"
            />
            <span className="text-sm text-gray-800">{ar ? "% للسقف" : "% down to it"}</span>
            <button
              onClick={sweepCeiling}
              disabled={sweeping || ceiling < 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 disabled:opacity-50"
            >
              {sweeping ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" aria-hidden="true" />
              )}
              {ar ? "نفّذ" : "Sweep"}
            </button>
            <span className="text-xs text-gray-500">
              {ar
                ? "بينزّل نسخة احتياطية بالنِسب القديمة قبل ما يغيّر."
                : "Downloads a backup of the old percentages before it changes anything."}
            </span>
          </div>
        </div>
      )}

      {overOnPage > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
          <p className="text-sm text-amber-900">
            {ar
              ? `${overOnPage} منتج في الصفحة دي خصمه فوق ${CEILING}%.`
              : `${overOnPage} products on this page are discounted above ${CEILING}%.`}
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
            {categories.map((c) => (
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
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {([
                ["percent", ar ? "خصم" : "Discount", TagIcon],
                ["window", ar ? "مواعيد" : "Window", CalendarDaysIcon],
                ["ladder", ar ? "أسعار جملة" : "Ladder", Square3Stack3DIcon],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                    mode === key ? "bg-gray-900 text-white" : "bg-white text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPicked(new Set())}
              className="text-sm text-gray-500 hover:text-gray-800 ms-auto"
            >
              {ar ? "إلغاء التحديد" : "Clear"}
            </button>
          </div>

          {mode === "percent" && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
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
              <button
                onClick={applyPercent}
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
                {tab === "add" ? (ar ? "ضيف للعروض" : "Add to deals") : ar ? "غيّر الخصم" : "Set discount"}
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
            </div>
          )}

          {mode === "window" && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-gray-500">
                {ar
                  ? "الجدولة بتشغّل الخصم وتقفله لوحدها في المواعيد دي. سيب خانة فاضية يعني مفتوح من الناحية دي."
                  : "The scheduler switches the sale on and off at these times. An empty box means open-ended on that side."}
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{ar ? "يبدأ" : "Starts"}</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="rounded-lg border border-gray-300 py-1.5 px-2 text-sm"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{ar ? "ينتهي" : "Ends"}</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="rounded-lg border border-gray-300 py-1.5 px-2 text-sm"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{ar ? "بخصم" : "At"}</label>
                  <input
                    type="number"
                    min={1}
                    max={overrideCeiling ? 100 : CEILING}
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 py-1.5 px-2 text-sm tabular-nums"
                    dir="ltr"
                  />
                </div>
                <button
                  onClick={applyWindow}
                  disabled={busy || (overCeiling && !overrideCeiling)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent,#00A8E8)] text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  <CalendarDaysIcon className="w-4 h-4" aria-hidden="true" />
                  {ar ? "اظبط المواعيد" : "Set window"}
                </button>
                <button
                  onClick={clearWindow}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
                >
                  {ar ? "شيل المواعيد" : "Clear window"}
                </button>
              </div>
            </div>
          )}

          {mode === "ladder" && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-gray-500">
                {ar
                  ? "سعر مختلف حسب الكمية. بيتطبق على كل المنتجات المتحددة بنفس الشكل."
                  : "A different price per quantity, applied identically to every selected product."}
              </p>
              {tiers.map((t, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{ar ? "من كمية" : "From qty"}</label>
                    <input
                      type="number"
                      min={1}
                      value={t.minQty}
                      onChange={(e) =>
                        setTiers((p) => p.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)))
                      }
                      className="w-24 rounded-lg border border-gray-300 py-1.5 px-2 text-sm tabular-nums"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{ar ? "سعر القطعة" : "Unit price"}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={t.unitPrice}
                      onChange={(e) =>
                        setTiers((p) => p.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))
                      }
                      className="w-28 rounded-lg border border-gray-300 py-1.5 px-2 text-sm tabular-nums"
                      dir="ltr"
                    />
                  </div>
                  <button
                    onClick={() => setTiers((p) => p.filter((_, j) => j !== i))}
                    disabled={tiers.length === 1}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-600 disabled:opacity-40"
                  >
                    <MinusCircleIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setTiers((p) => [...p, { minQty: "", unitPrice: "" }])}
                  disabled={tiers.length >= 10}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-40"
                >
                  <PlusCircleIcon className="w-4 h-4" aria-hidden="true" />
                  {ar ? "درجة كمان" : "Add tier"}
                </button>
                <button
                  onClick={applyLadder}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent,#00A8E8)] text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  <Square3Stack3DIcon className="w-4 h-4" aria-hidden="true" />
                  {ar ? "طبّق السلّم" : "Apply ladder"}
                </button>
                <button
                  onClick={clearLadder}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
                >
                  {ar ? "شيل السلّم" : "Clear ladder"}
                </button>
              </div>
            </div>
          )}

          {/* Said out loud, because it is the shop's own rule being crossed. */}
          {overCeiling && mode !== "ladder" && (
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

      {/* The header checkbox ticks the page, which is the honest thing for it to
          do and the wrong thing for someone clearing a campaign. Offered only
          once the page is fully ticked and there is more behind it, so it reads
          as the answer to a question already being asked. */}
      {allShown && rows.pages > 1 && picked.size < rows.total && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-sky-300 bg-sky-50 p-3">
          <span className="text-sm text-sky-900">
            {ar
              ? `الـ ${rows.data.length} اللي في الصفحة دي متحددين.`
              : `All ${rows.data.length} on this page are selected.`}
          </span>
          <button
            onClick={selectAllMatching}
            disabled={picking}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {picking && <ArrowPathIcon className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {ar ? `حدد الـ ${rows.total.toLocaleString()} كلهم` : `Select all ${rows.total.toLocaleString()}`}
          </button>
        </div>
      )}

      {picked.size > rows.data.length && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-sky-300 bg-sky-50 p-3">
          <span className="text-sm font-medium text-sky-900">
            {ar
              ? `${picked.size.toLocaleString()} منتج متحددين عبر كل الصفحات.`
              : `${picked.size.toLocaleString()} products selected across every page.`}
          </span>
          <button onClick={() => setPicked(new Set())} className="text-sm text-sky-700 underline">
            {ar ? "إلغاء التحديد" : "Clear selection"}
          </button>
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
          <div className="overflow-x-auto">
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
                  <th className="p-3 font-medium whitespace-nowrap">{ar ? "المواعيد" : "Window"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.data.map((r) => {
                  const pct = r.saleActive ? r.salePercentage || 0 : 0;
                  const sells = (r.price || 0) * (1 - pct / 100);
                  const hot = pct > CEILING;
                  const win = [r.saleStartsAt, r.saleEndsAt]
                    .filter(Boolean)
                    .map((d) => new Date(d as string).toLocaleDateString(ar ? "ar-EG" : "en-GB"))
                    .join(" → ");
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
                          {[r.sku, categoryOf(r, ar)].filter(Boolean).join(" · ")}
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
                      <td className="p-3 text-xs text-gray-500 whitespace-nowrap" dir="ltr">
                        {win || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
