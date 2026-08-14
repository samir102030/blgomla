import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCollectionStore } from "../../stores/collection.store";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import { useMoney } from "../../lib/money";
import { cldImg } from "../../lib/cldImage";

interface Brand {
  _id: string;
  name: string;
  nameAr?: string;
  logo?: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  saleActive?: boolean;
  salePercentage?: number;
  stock?: number;
  images?: Array<{ url: string }>;
  brand?: Brand | null;
  store?: { _id: string; name?: string; storeName?: string } | null;
}

/** A line on the quote being edited. */
interface Line {
  product: Product;
  quantity: number;
  /** "" means follow the catalogue price. */
  unitPrice: string;
}

const storeNameOf = (s?: Product["store"]) => s?.name || s?.storeName || "";

/** Catalogue price for a product, honouring an active sale. */
const catalogPrice = (p: Product) =>
  p.saleActive && p.salePercentage
    ? p.price * (1 - p.salePercentage / 100)
    : p.price;

/** What a line actually costs per unit — override wins, including 0. */
const linePrice = (line: Line) =>
  line.unitPrice === "" ? catalogPrice(line.product) : Number(line.unitPrice) || 0;

const emptyInstallation = { offered: false, price: "", note: "" };

const AdminCollectionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  const money = useMoney();
  const {
    collections,
    loading,
    error,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useCollectionStore();

  // ── the quote being edited ──────────────────────────────────────────────
  const [formState, setFormState] = useState({ name: "", description: "", bundlePrice: "" });
  const [lines, setLines] = useState<Line[]>([]);
  const [pickedBrands, setPickedBrands] = useState<Brand[]>([]);
  const [installation, setInstallation] = useState(emptyInstallation);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── the product picker ──────────────────────────────────────────────────
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchCollections({ activeOnly: "false" });
  }, [fetchCollections]);

  useEffect(() => {
    axiosInstance
      .get("/brands", { params: { limit: 200 } })
      .then(({ data }) => setBrands(data.brands || data.data || []))
      .catch(() => setBrands([]));
  }, []);

  // Search runs on the server: the catalogue is far too big to filter in the
  // browser, which is what the old picker tried to do — it asked for 500
  // products, read them off the wrong response key, and rendered nothing.
  const searchSeq = useRef(0);
  const runSearch = useCallback(async (term: string, brandId: string) => {
    const seq = ++searchSeq.current;
    setSearching(true);
    try {
      const { data } = await axiosInstance.get("/products", {
        params: {
          limit: 24,
          isActive: true,
          deleted: false,
          ...(term ? { search: term } : {}),
          ...(brandId ? { brandId } : {}),
        },
      });
      // Stale responses must not overwrite fresher ones — without this a slow
      // reply for "cam" can land after "camera" and put the wrong list up.
      if (seq !== searchSeq.current) return;
      setResults(data.data || []);
    } catch {
      if (seq === searchSeq.current) setResults([]);
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const id = setTimeout(() => runSearch(search, brandFilter), 300);
    return () => clearTimeout(id);
  }, [search, brandFilter, showForm, runSearch]);

  // ── derived totals ──────────────────────────────────────────────────────
  const itemsTotal = useMemo(
    () => lines.reduce((sum, l) => sum + linePrice(l) * l.quantity, 0),
    [lines]
  );
  const bundlePrice = parseFloat(formState.bundlePrice) || 0;
  const savings = Math.max(itemsTotal - bundlePrice, 0);
  const savingsPct = itemsTotal > 0 ? Math.round((savings / itemsTotal) * 100) : 0;
  const overPriced = bundlePrice > itemsTotal && itemsTotal > 0;

  // A bundle belongs to one store and every product in it must come from that
  // store, so the store is inferred from the picks rather than asked for.
  const storeIds = useMemo(
    () => Array.from(new Set(lines.map((l) => l.product.store?._id).filter(Boolean))),
    [lines]
  );
  const mixedStores = storeIds.length > 1;
  const storeLabel = useMemo(() => {
    if (storeIds.length !== 1) return null;
    return storeNameOf(lines.find((l) => l.product.store?._id === storeIds[0])?.product.store);
  }, [lines, storeIds]);

  /** Brands actually represented by the picked products. */
  const brandsInLines = useMemo(() => {
    const map = new Map<string, Brand>();
    lines.forEach((l) => l.product.brand && map.set(l.product.brand._id, l.product.brand));
    return Array.from(map.values());
  }, [lines]);

  const missingBrands = useMemo(
    () => brandsInLines.filter((b) => !pickedBrands.some((p) => p._id === b._id)),
    [brandsInLines, pickedBrands]
  );

  // ── line editing ────────────────────────────────────────────────────────
  const addLine = (product: Product) => {
    setLines((prev) => {
      const at = prev.findIndex((l) => l.product._id === product._id);
      if (at > -1) {
        const next = [...prev];
        next[at] = { ...next[at], quantity: next[at].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1, unitPrice: "" }];
    });
    // Pull the product's brand onto the quote header automatically — it is
    // almost always wanted, and it stays removable.
    if (product.brand) {
      setPickedBrands((prev) =>
        prev.some((b) => b._id === product.brand!._id) ? prev : [...prev, product.brand!]
      );
    }
  };

  const patchLine = (id: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.product._id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.product._id !== id));

  const toggleBrand = (brand: Brand) =>
    setPickedBrands((prev) =>
      prev.some((b) => b._id === brand._id)
        ? prev.filter((b) => b._id !== brand._id)
        : [...prev, brand]
    );

  const resetForm = () => {
    setFormState({ name: "", description: "", bundlePrice: "" });
    setLines([]);
    setPickedBrands([]);
    setInstallation(emptyInstallation);
    setEditingId(null);
    setShowForm(false);
    setSearch("");
    setBrandFilter("");
    setResults([]);
  };

  // ── save ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.length < 2) {
      toast.error(t("adminCollections.needTwo", "A quote needs at least two items"));
      return;
    }
    if (mixedStores) {
      toast.error(
        t("adminCollections.singleStoreOnly", "All products in a bundle must come from the same store")
      );
      return;
    }
    if (!(bundlePrice > 0)) {
      toast.error(t("adminCollections.invalidBundlePrice"));
      return;
    }
    if (overPriced) {
      toast.error(
        t("adminCollections.bundleTooHigh", "The quote total can't be more than the items add up to")
      );
      return;
    }

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim(),
      bundlePrice,
      items: lines.map((l) => ({
        product: l.product._id,
        quantity: l.quantity,
        unitPrice: l.unitPrice === "" ? null : Number(l.unitPrice),
      })),
      brands: pickedBrands.map((b) => b._id),
      installation: {
        offered: installation.offered,
        price: installation.offered ? Number(installation.price) || 0 : 0,
        note: installation.note.trim(),
      },
      store: storeIds[0],
    };

    setSaving(true);
    const ok = editingId
      ? !!(await updateCollection(editingId, payload as any))
      : !!(await createCollection(payload as any));
    setSaving(false);

    if (ok) {
      toast.success(
        editingId ? t("adminCollections.updateSuccess") : t("adminCollections.createSuccess")
      );
      resetForm();
    } else {
      toast.error(
        useCollectionStore.getState().error ||
          (editingId ? t("adminCollections.updateFailed") : t("adminCollections.createFailed"))
      );
    }
  };

  const handleEdit = (collection: any) => {
    setFormState({
      name: collection.name || "",
      description: collection.description || "",
      bundlePrice: String(collection.bundlePrice ?? ""),
    });
    setLines(
      (collection.items || [])
        .filter((i: any) => i.product)
        .map((i: any) => ({
          product: i.product,
          quantity: i.quantity,
          unitPrice:
            i.unitPrice === null || i.unitPrice === undefined ? "" : String(i.unitPrice),
        }))
    );
    setPickedBrands(collection.brands || []);
    setInstallation({
      offered: !!collection.installation?.offered,
      price: collection.installation?.price ? String(collection.installation.price) : "",
      note: collection.installation?.note || "",
    });
    setEditingId(collection._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("adminCollections.confirmDelete"))) return;
    const ok = await deleteCollection(id);
    toast[ok ? "success" : "error"](
      ok ? t("adminCollections.deleteSuccess") : t("adminCollections.deleteFailed")
    );
  };

  const field =
    "w-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all";

  if (loading && collections.length === 0 && !showForm) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)] mx-auto" />
          <p className="mt-4 text-[var(--text-muted)]">{t("adminCollections.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
            {t("adminCollections.title")}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {t("adminCollections.quoteSubtitle", "Build a package quote: pick the items, set the prices, offer fitting.")}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity w-full sm:w-auto text-sm font-semibold"
          >
            + {t("adminCollections.createCollection")}
          </button>
        )}
      </div>

      {error && !showForm && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] p-5 sm:p-6 space-y-6"
        >
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {editingId
              ? t("adminCollections.editCollection")
              : t("adminCollections.createNewCollection")}
          </h2>

          {/* ── basics ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                {t("adminCollections.collectionName")} *
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                className={field}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                {t("adminCollections.description")}
              </label>
              <input
                type="text"
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                className={field}
              />
            </div>
          </div>

          {/* ── brands on the quote ── */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              {t("adminCollections.brands", "Brands in this quote")}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {pickedBrands.length === 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  {t("adminCollections.noBrands", "None yet — added automatically as you pick items.")}
                </span>
              )}
              {pickedBrands.map((b) => (
                <span
                  key={b._id}
                  className="inline-flex items-center gap-1.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 rounded-full ps-2.5 pe-1.5 py-1 text-xs font-medium"
                >
                  {isAr && b.nameAr ? b.nameAr : b.name}
                  <button
                    type="button"
                    onClick={() => toggleBrand(b)}
                    aria-label={t("adminCollections.removeBrand", "Remove brand")}
                    className="w-4 h-4 rounded-full hover:bg-[var(--brand-primary)]/20 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <select
              value=""
              onChange={(e) => {
                const b = brands.find((x) => x._id === e.target.value);
                if (b) toggleBrand(b);
              }}
              className={field}
            >
              <option value="">{t("adminCollections.addBrand", "+ Add a brand…")}</option>
              {brands
                .filter((b) => !pickedBrands.some((p) => p._id === b._id))
                .map((b) => (
                  <option key={b._id} value={b._id}>
                    {isAr && b.nameAr ? b.nameAr : b.name}
                  </option>
                ))}
            </select>
            {missingBrands.length > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
                {t("adminCollections.brandsNotListed", "Items from these brands aren't listed above")}:{" "}
                {missingBrands.map((b) => b.name).join("، ")}
              </p>
            )}
          </div>

          {/* ── item picker ── */}
          <div className="border-t border-[var(--border)] pt-5">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
              {t("adminCollections.addProducts")}
            </label>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("adminCollections.searchProducts", "Search products…")}
                className={field}
              />
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className={`${field} sm:w-56`}
              >
                <option value="">{t("adminCollections.allBrands", "All brands")}</option>
                {brands.map((b) => (
                  <option key={b._id} value={b._id}>
                    {isAr && b.nameAr ? b.nameAr : b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] max-h-72 overflow-y-auto">
              {searching && (
                <p className="p-4 text-sm text-[var(--text-muted)] text-center">
                  {t("adminCollections.searching", "Searching…")}
                </p>
              )}
              {!searching && results.length === 0 && (
                <p className="p-4 text-sm text-[var(--text-muted)] text-center">
                  {t("adminCollections.noProducts", "No products match.")}
                </p>
              )}
              {!searching &&
                results.map((p) => {
                  const added = lines.some((l) => l.product._id === p._id);
                  const blocked =
                    !added && storeIds.length === 1 && p.store?._id !== storeIds[0];
                  return (
                    <div key={p._id} className="flex items-center gap-3 p-2.5">
                      <img
                        src={cldImg(p.images?.[0]?.url, { w: 80 }) || "/placeholder.png"}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-lg object-cover bg-[var(--bg)] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] truncate">{p.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {p.brand?.name || t("adminCollections.noBrand", "No brand")}
                          {storeNameOf(p.store) ? ` · ${storeNameOf(p.store)}` : ""}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[var(--text)] shrink-0">
                        {money(catalogPrice(p))}
                      </span>
                      <button
                        type="button"
                        disabled={added || blocked}
                        onClick={() => addLine(p)}
                        title={
                          blocked
                            ? t("adminCollections.otherStore", "Belongs to a different store")
                            : undefined
                        }
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {added ? t("adminCollections.added", "Added") : t("adminCollections.add", "Add")}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ── the quote itself ── */}
          <div className="border-t border-[var(--border)] pt-5">
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
              {t("adminCollections.quoteLines", "The quote")} ({lines.length})
            </label>

            {lines.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl p-6 text-center">
                {t("adminCollections.emptyQuote", "Nothing added yet. Search above and add at least two items.")}
              </p>
            ) : (
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead className="bg-[var(--bg)]">
                      <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                        <th className="text-start px-3 py-2 font-semibold">
                          {t("adminCollections.item", "Item")}
                        </th>
                        <th className="text-center px-3 py-2 font-semibold w-24">
                          {t("adminCollections.qty", "Qty")}
                        </th>
                        <th className="text-center px-3 py-2 font-semibold w-36">
                          {t("adminCollections.unitPrice", "Unit price")}
                        </th>
                        <th className="text-end px-3 py-2 font-semibold w-28">
                          {t("adminCollections.lineTotal", "Total")}
                        </th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {lines.map((l) => (
                        <tr key={l.product._id}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={cldImg(l.product.images?.[0]?.url, { w: 80 }) || "/placeholder.png"}
                                alt={l.product.name}
                                loading="lazy"
                                decoding="async"
                                className="w-9 h-9 rounded-lg object-cover bg-[var(--bg)] shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-[var(--text)] truncate max-w-[220px]">
                                  {l.product.name}
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)] truncate">
                                  {l.product.brand?.name || "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={l.quantity}
                              onChange={(e) =>
                                patchLine(l.product._id, {
                                  quantity: Math.max(1, parseInt(e.target.value) || 1),
                                })
                              }
                              className={`${field} text-center py-1.5`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={l.unitPrice}
                              placeholder={String(Math.round(catalogPrice(l.product)))}
                              onChange={(e) =>
                                patchLine(l.product._id, { unitPrice: e.target.value })
                              }
                              className={`${field} text-center py-1.5`}
                            />
                          </td>
                          <td className="px-3 py-2 text-end font-semibold text-[var(--text)] whitespace-nowrap">
                            {money(linePrice(l) * l.quantity)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(l.product._id)}
                              aria-label={t("adminCollections.removeItem", "Remove item")}
                              className="text-red-500 hover:text-red-700 text-base leading-none px-1"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-[var(--bg)] px-4 py-3 space-y-2 border-t border-[var(--border)]">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {t(
                      "adminCollections.priceHint",
                      "Leave a price empty to follow the product's own price."
                    )}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">
                      {t("adminCollections.totalOriginal")}
                    </span>
                    <span className="font-semibold text-[var(--text)]">{money(itemsTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <label className="text-sm font-semibold text-[var(--text)] shrink-0">
                      {t("adminCollections.bundlePrice")} *
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formState.bundlePrice}
                      onChange={(e) =>
                        setFormState({ ...formState, bundlePrice: e.target.value })
                      }
                      className={`${field} max-w-[180px] text-end`}
                      required
                    />
                  </div>
                  {overPriced ? (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {t(
                        "adminCollections.bundleTooHigh",
                        "The quote total can't be more than the items add up to"
                      )}
                    </p>
                  ) : savings > 0 ? (
                    <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>{t("adminCollections.customerSaves", "Customer saves")}</span>
                      <span>
                        {money(savings)} ({savingsPct}%)
                      </span>
                    </div>
                  ) : null}

                  {mixedStores ? (
                    <p className="text-xs text-red-600 dark:text-red-400 border-t border-[var(--border)] pt-2">
                      {t(
                        "adminCollections.singleStoreOnly",
                        "All products in a bundle must come from the same store"
                      )}
                    </p>
                  ) : storeLabel ? (
                    <p className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-2">
                      {t("adminCollections.belongsToStore", "Store")}:{" "}
                      <span className="font-medium text-[var(--text)]">{storeLabel}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* ── installation ── */}
          <div className="border-t border-[var(--border)] pt-5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={installation.offered}
                onChange={(e) =>
                  setInstallation({ ...installation, offered: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 accent-[var(--brand-primary)]"
              />
              <span>
                <span className="text-sm font-semibold text-[var(--text)]">
                  {t("adminCollections.offerInstallation", "Offer installation for this quote")}
                </span>
                <span className="block text-xs text-[var(--text-muted)] mt-0.5">
                  {t(
                    "adminCollections.offerInstallationHint",
                    "The customer gets a yes/no choice on the collection page."
                  )}
                </span>
              </span>
            </label>

            {installation.offered && (
              <div className="mt-3 ps-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    {t("adminCollections.installationPrice", "Installation price")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={installation.price}
                    onChange={(e) =>
                      setInstallation({ ...installation, price: e.target.value })
                    }
                    placeholder="0"
                    className={field}
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    {Number(installation.price) > 0
                      ? t("adminCollections.perBundle", "Added per bundle ordered.")
                      : t("adminCollections.freeInstall", "Zero shows as “included”.")}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    {t("adminCollections.installationNote", "Note for the customer")}
                  </label>
                  <input
                    type="text"
                    value={installation.note}
                    onChange={(e) =>
                      setInstallation({ ...installation, note: e.target.value })
                    }
                    className={field}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-5">
            <button
              type="submit"
              disabled={saving}
              className="bg-[var(--brand-primary)] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving
                ? t("adminCollections.saving", "Saving…")
                : editingId
                  ? t("adminCollections.update")
                  : t("adminCollections.create")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="border border-[var(--border)] text-[var(--text-muted)] px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--bg)] transition-colors"
            >
              {t("adminCollections.cancel")}
            </button>
          </div>
        </form>
      )}

      {/* ── existing quotes ── */}
      <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-[var(--bg)]">
              <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-6 py-3 text-start font-semibold">
                  {t("adminCollections.colName")}
                </th>
                <th className="px-6 py-3 text-start font-semibold">
                  {t("adminCollections.colProducts")}
                </th>
                <th className="px-6 py-3 text-start font-semibold">
                  {t("adminCollections.colBundlePrice")}
                </th>
                <th className="px-6 py-3 text-start font-semibold">
                  {t("adminCollections.colInstallation", "Installation")}
                </th>
                <th className="px-6 py-3 text-start font-semibold">
                  {t("adminCollections.colStore")}
                </th>
                <th className="px-6 py-3 text-start font-semibold">
                  {t("adminCollections.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {collections.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
                    {t("adminCollections.empty", "No quotes yet.")}
                  </td>
                </tr>
              )}
              {collections.map((collection: any) => (
                <tr key={collection._id} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[var(--text)]">
                      {collection.name}
                    </div>
                    {collection.brands?.length > 0 && (
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {collection.brands.map((b: Brand) => b.name).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text)] whitespace-nowrap">
                    {collection.items.length} {t("adminCollections.productsCount")}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[var(--text)] whitespace-nowrap">
                    {money(collection.bundlePrice)}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {collection.installation?.offered ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {collection.installation.price > 0
                          ? money(collection.installation.price)
                          : t("adminCollections.included", "Included")}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)] whitespace-nowrap">
                    {typeof collection.store === "string"
                      ? "—"
                      : collection.store?.name || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(collection)}
                      className="text-[var(--brand-primary)] hover:underline me-3"
                    >
                      {t("adminCollections.edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(collection._id)}
                      className="text-red-600 hover:underline"
                    >
                      {t("adminCollections.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCollectionsPage;
