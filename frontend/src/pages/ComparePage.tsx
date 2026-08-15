import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import { axiosInstance } from "../lib/axios";
import { useCompareStore } from "../stores/compare.store";
import { getBaseUnitPrice } from "../lib/pricing";
import { cldImg } from "../lib/cldImage";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product.type";

const ComparePage: React.FC = () => {
  const { t } = useTranslation();
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const { data } = await axiosInstance.post<{ data: Product[] }>(
          "/products/by-ids",
          { ids }
        );
        if (!cancelled) setProducts(data.data || []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const brandName = (p: Product) =>
    typeof p.brand === "string" ? "" : p.brand?.name || "";

  // Union of all attribute names across the compared products, in first-seen order.
  const attributeNames = Array.from(
    new Set(
      products.flatMap((p) => (p.attributes || []).map((a) => a.name))
    )
  );
  const attrValue = (p: Product, name: string) =>
    (p.attributes || []).find((a) => a.name === name)?.value || "—";

  const rows: Array<{ label: string; render: (p: Product) => React.ReactNode }> = [
    {
      label: t("Price"),
      render: (p) => (
        <span className="font-bold text-[var(--brand-primary)]">
          {getBaseUnitPrice(p).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}
        </span>
      ),
    },
    { label: t("Rating"), render: (p) => <>★ {(p.rating || 0).toFixed(1)}</> },
    { label: t("Brand"), render: (p) => <>{brandName(p) || "—"}</> },
    {
      label: t("Availability"),
      render: (p) =>
        p.stock > 0 ? (
          <span className="text-emerald-600">{t("In Stock")}</span>
        ) : (
          <span className="text-red-600">{t("Out of Stock")}</span>
        ),
    },
    ...attributeNames.map((name) => ({
      label: name,
      render: (p: Product) => <>{attrValue(p, name)}</>,
    })),
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <PageHero
        eyebrow={t("Side by side")}
        title={t("Compare Products")}
        breadcrumb={[{ label: t("Home"), to: "/" }, { label: t("Compare Products") }]}
        actions={
          products.length > 0 ? (
            <button onClick={clear} className="btn btn-sm btn-on-ink">
              {t("Clear all")}
            </button>
          ) : undefined
        }
        aside={
          products.length > 0 ? (
            <div className="text-start lg:text-end">
              <div className="text-display-sm text-[var(--on-ink)]">
                {products.length}
              </div>
              <div className="text-xs sm:text-sm text-[var(--on-ink-muted)]">
                {products.length === 1 ? t("item") : t("items")}
              </div>
            </div>
          ) : undefined
        }
      />
      <main className="shell py-8 sm:py-12">
        {loading ? (
          <p className="text-[var(--text-muted)]">{t("Loading…")}</p>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)] mb-4">
              {t("No products selected to compare yet.")}
            </p>
            <Link
              to="/products"
              className="inline-block rounded-md px-6 py-3 text-white font-medium"
              style={{ background: "var(--brand-gradient)" }}
            >
              {t("Browse Products")}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-[var(--bg)] z-10 w-32 sm:w-40" />
                  {products.map((p) => (
                    <th key={p._id} className="p-3 align-top min-w-[180px]">
                      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => remove(p._id)}
                            className="text-[var(--text-subtle)] hover:text-red-600"
                            aria-label={t("Remove")}
                          >
                            ✕
                          </button>
                        </div>
                        <Link to={`/product/${p._id}`}>
                          <img
                            src={cldImg(p.images?.[0]?.url, { w: 200 })}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            className="w-24 h-24 object-contain mx-auto bg-[var(--surface)] rounded-lg"
                          />
                          <p className="mt-2 text-sm font-medium text-[var(--text)] line-clamp-2 text-center hover:text-[var(--brand-primary)]">
                            {p.name}
                          </p>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.label} className={i % 2 ? "bg-[var(--surface-2)]" : ""}>
                    <td className="sticky left-0 bg-inherit z-10 p-3 text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                      {row.label}
                    </td>
                    {products.map((p) => (
                      <td key={p._id} className="p-3 text-xs sm:text-sm text-[var(--text)] text-center">
                        {row.render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ComparePage;
