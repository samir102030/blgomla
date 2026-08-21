import React, { useCallback, useEffect, useState } from "react";
import { InboxIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";

interface RequestedProduct {
  id?: string;
  name?: string;
  price?: number;
  stock?: number;
  image?: string | null;
}

interface StockRequest {
  id: string;
  email: string;
  type: "restock" | "price_drop";
  notified: boolean;
  createdAt: string;
  priceAtSubscribe?: number;
  product?: RequestedProduct;
}

interface TopProduct {
  id: string;
  name?: string;
  stock?: number;
  image?: string | null;
  requests: number;
  lastRequest: string;
}

interface Summary {
  total: number;
  pendingRestock: number;
  notified: number;
  productsWaitedFor: number;
}

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f3f4f6'/><text x='32' y='38' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'>No image</text></svg>";

const StockRequestsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState<"restock" | "price_drop" | "all">("restock");
  const [status, setStatus] = useState<"all" | "pending" | "notified">("all");
  const [search, setSearch] = useState("");
  // Separate from `search` so typing doesn't fire a request per keystroke.
  const [query, setQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/stock-alerts", {
        params: {
          page,
          limit: 25,
          ...(type !== "all" ? { type } : {}),
          ...(status !== "all" ? { status } : {}),
          ...(query ? { q: query } : {}),
        },
      });
      if (data.success) {
        setSummary(data.data.summary);
        setTopProducts(data.data.topProducts || []);
        setRequests(data.data.requests || []);
        setPages(data.data.pages || 1);
        setTotal(data.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch stock requests:", err);
    } finally {
      setLoading(false);
    }
  }, [page, type, status, query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Any filter change puts you back on page 1 — page 4 of the old result set
  // is meaningless against the new one.
  useEffect(() => {
    setPage(1);
  }, [type, status, query]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {t("stockRequests.title")}
        </h1>
        <p className="text-sm text-gray-600">{t("stockRequests.subtitle")}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-[var(--brand-primary)]">
          <p className="text-sm font-medium text-gray-600">{t("stockRequests.total")}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">{t("stockRequests.waiting")}</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary?.pendingRestock ?? 0}</p>
          <p className="text-xs text-red-500 mt-1">{t("stockRequests.waitingHint")}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-amber-500">
          <p className="text-sm font-medium text-gray-600">{t("stockRequests.products")}</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary?.productsWaitedFor ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">{t("stockRequests.notified")}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{summary?.notified ?? 0}</p>
        </div>
      </div>

      {/* Most wanted */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
 {t("stockRequests.mostWanted")}
          </h2>
          <p className="text-xs text-gray-500 mb-4">{t("stockRequests.mostWantedHint")}</p>
          <div className="space-y-3">
            {topProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={p.image || PLACEHOLDER}
                    alt={p.name || ""}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                    }}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  {p.id ? (
                    <Link
                      to={`/product/${p.id}`}
                      className="font-medium text-gray-900 hover:text-[var(--brand-primary)] truncate block"
                    >
                      {p.name || t("stockRequests.deletedProduct")}
                    </Link>
                  ) : (
                    <p className="font-medium text-gray-400 italic truncate">
                      {t("stockRequests.deletedProduct")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {t("stockRequests.inStockNow", { count: p.stock ?? 0 })}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex-shrink-0">
                  {t("stockRequests.peopleWaiting", { count: p.requests })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQuery(search.trim());
          }}
          onBlur={() => setQuery(search.trim())}
          placeholder={t("stockRequests.searchPlaceholder")}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="restock">{t("stockRequests.typeRestock")}</option>
          <option value="price_drop">{t("stockRequests.typePriceDrop")}</option>
          <option value="all">{t("stockRequests.typeAll")}</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="all">{t("stockRequests.statusAll")}</option>
          <option value="pending">{t("stockRequests.statusPending")}</option>
          <option value="notified">{t("stockRequests.statusNotified")}</option>
        </select>
      </div>

      {/* The log itself — product asked for, next to who asked */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">
                  {t("stockRequests.colProduct")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">
                  {t("stockRequests.colEmail")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">
                  {t("stockRequests.colDate")}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">
                  {t("stockRequests.colStatus")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          loading="lazy"
                          decoding="async"
                          src={r.product?.image || PLACEHOLDER}
                          alt={r.product?.name || ""}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                          }}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        {r.product?.id ? (
                          <Link
                            to={`/product/${r.product.id}`}
                            className="font-medium text-gray-900 hover:text-[var(--brand-primary)] line-clamp-1"
                          >
                            {r.product.name}
                          </Link>
                        ) : (
                          <p className="font-medium text-gray-400 italic">
                            {t("stockRequests.deletedProduct")}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {r.type === "restock"
                            ? t("stockRequests.inStockNow", { count: r.product?.stock ?? 0 })
                            : t("stockRequests.priceWhenAsked", {
                                price: (r.priceAtSubscribe ?? 0).toLocaleString(),
                              })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${r.email}`}
                      className="text-[var(--brand-primary)] hover:underline break-all"
                    >
                      {r.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        r.notified
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.notified
                        ? t("stockRequests.statusNotified")
                        : t("stockRequests.statusPending")}
                    </span>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="text-3xl mb-2"><InboxIcon className="w-7 h-7" aria-hidden="true" /></div>
                    <p className="text-gray-500 font-medium">{t("stockRequests.empty")}</p>
                    <p className="text-sm text-gray-400 mt-1">{t("stockRequests.emptyHint")}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {t("stockRequests.showing", {
                from: (page - 1) * 25 + 1,
                to: Math.min(page * 25, total),
                total,
              })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                {t("stockRequests.prev")}
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                {t("stockRequests.next")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockRequestsPage;
