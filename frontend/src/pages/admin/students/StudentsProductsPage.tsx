import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../../../lib/axios";
import { useStudentStore, type ShelfProduct } from "../../../stores/student.store";
import {
  Card,
  PageHead,
  btnPrimary,
  firstImage,
  idsOf,
  inputCls,
  useLocalName,
} from "./shared";

/**
 * The shelf: products put in the student section one at a time.
 *
 * These are the shop's own products, not copies. A second product collection
 * would mean two prices, two stock counts and two places to edit the same
 * thing — and no way to tell a customer which of them they were looking at.
 * So this page picks from the catalogue rather than adding to it.
 *
 * It sits alongside the departments rather than replacing them: departments
 * are how you put a whole shelf in at once, this is how you add the one laptop
 * that belongs there and lives somewhere else.
 */

const StudentsProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const localName = useLocalName();
  const { settings, saving, fetchSettings, saveSettings } = useStudentStore();

  const [picked, setPicked] = useState<ShelfProduct[]>([]);
  const [dirty, setDirty] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ShelfProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings && !dirty) {
      setPicked((settings.products || []).filter((p): p is ShelfProduct => typeof p !== "string"));
    }
  }, [settings, dirty]);

  /* Search the catalogue, debounced. The sequence number is what stops a slow
     early response landing after a fast later one and showing stale results. */
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get("/products", {
          params: { search: term, limit: 20, isActive: true, deleted: false },
        });
        if (seq !== searchSeq.current) return;
        setResults(data.data || []);
      } catch {
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const pickedIds = useMemo(() => new Set(picked.map((p) => String(p._id))), [picked]);

  const add = (product: ShelfProduct) => {
    if (pickedIds.has(String(product._id))) return;
    setDirty(true);
    setPicked((prev) => [product, ...prev]);
  };

  const remove = (id: string) => {
    setDirty(true);
    setPicked((prev) => prev.filter((p) => String(p._id) !== id));
  };

  const onSave = async () => {
    if (await saveSettings({ products: picked.map((p) => String(p._id)) as any })) {
      setDirty(false);
      toast.success(t("Shelf saved."));
    }
  };

  const departments = idsOf(settings?.categories).length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <PageHead
        title={t("Products")}
        description={t(
          "Products added to the student section by hand, on top of whatever the departments already bring in. They are the shop's own products — one price, one stock count, edited in one place.",
        )}
      >
        <button onClick={onSave} disabled={saving || !dirty} className={btnPrimary}>
          {saving ? t("Saving…") : t("Save shelf")}
        </button>
      </PageHead>

      <Card
        title={t("Add from the catalogue")}
        description={t("Search by name in Arabic or English, then add what belongs in the section.")}
      >
        <input
          className={`${inputCls} max-w-xl`}
          placeholder={t("Search products") as string}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {searching && <p className="text-sm text-[var(--text-muted)] mt-3">{t("Searching…")}</p>}

        {!searching && query.trim().length >= 2 && !results.length && (
          <p className="text-sm text-[var(--text-muted)] mt-3">{t("Nothing matched that.")}</p>
        )}

        {!!results.length && (
          <ul className="mt-4 divide-y divide-[var(--border)] max-h-[380px] overflow-y-auto">
            {results.map((p) => {
              const already = pickedIds.has(String(p._id));
              return (
                <li key={p._id} className="flex items-center gap-3 py-2.5">
                  <img
                    src={firstImage(p.images) || "/placeholder.svg"}
                    alt=""
                    className="w-11 h-11 rounded-lg object-cover bg-[var(--surface-2)] flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--text)] truncate">
                      {localName(p)}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] font-mono">
                      {p.price} EGP · {t("Stock")} {p.stock ?? 0}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(p)}
                    disabled={already}
                    className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] disabled:opacity-40"
                  >
                    {already ? t("On the shelf") : t("Add")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title={`${t("On the shelf")} · ${picked.length}`}>
        {!picked.length && (
          <p className="text-sm text-[var(--text-muted)]">
            {departments
              ? t("Nothing picked by hand. The section still shows everything in its departments.")
              : t("Nothing picked, and no departments chosen — the section shows the whole catalogue.")}
          </p>
        )}

        <ul className="divide-y divide-[var(--border)]">
          {picked.map((p) => (
            <li key={p._id} className="flex items-center gap-3 py-3">
              <img
                src={firstImage(p.images) || "/placeholder.svg"}
                alt=""
                className="w-12 h-12 rounded-lg object-cover bg-[var(--surface-2)] flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--text)] truncate">{localName(p)}</div>
                <div className="text-xs text-[var(--text-muted)] font-mono">{p.price} EGP</div>
              </div>
              {p.isActive === false && (
                <span className="text-xs px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">
                  {t("Hidden on the storefront")}
                </span>
              )}
              <button
                onClick={() => remove(String(p._id))}
                className="text-sm text-[var(--danger)] hover:underline"
              >
                {t("Remove")}
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default StudentsProductsPage;
