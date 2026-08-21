import React, { useEffect, useState, useCallback } from "react";
import { CheckCircleIcon, CubeIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../../lib/axios";

interface StockSummary {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  healthyStock: number;
  totalUnits: number;
  totalValue: number;
}

interface StockProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
  sku: string | null;
  store: string;
  image: string | null;
}

interface UrgentRestock {
  id: string;
  name: string;
  currentStock: number;
  unitsSold: number;
  price: number;
}

const InventoryAlertsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(10);
  const [activeTab, setActiveTab] = useState<"outOfStock" | "lowStock" | "urgent">("outOfStock");
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [outOfStock, setOutOfStock] = useState<StockProduct[]>([]);
  const [lowStock, setLowStock] = useState<StockProduct[]>([]);
  const [urgentRestock, setUrgentRestock] = useState<UrgentRestock[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/analytics/inventory-alerts", {
        params: { lowStockThreshold: threshold },
      });
      if (data.success) {
        setSummary(data.data.summary);
        setOutOfStock(data.data.outOfStockProducts);
        setLowStock(data.data.lowStockProducts);
        setUrgentRestock(data.data.urgentRestock);
      }
    } catch (err) {
      console.error("Failed to fetch inventory data:", err);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stockHealthPercent =
    summary && summary.totalProducts > 0
      ? Math.round((summary.healthyStock / summary.totalProducts) * 100)
      : 0;

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const tabs = [
    { id: "outOfStock" as const, label: t("inventory.outOfStock"), count: summary?.outOfStock || 0, color: "red" },
    { id: "lowStock" as const, label: t("inventory.lowStock"), count: summary?.lowStock || 0, color: "yellow" },
    { id: "urgent" as const, label: t("inventory.urgentRestock"), count: urgentRestock.length, color: "orange" },
  ];

  const currentProducts = activeTab === "outOfStock" ? outOfStock : activeTab === "lowStock" ? lowStock : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("inventory.title")}</h1>
          <p className="text-sm text-gray-600">{t("inventory.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 whitespace-nowrap">{t("inventory.thresholdLabel")}</label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value={5}>5 {t("inventory.units")}</option>
            <option value={10}>10 {t("inventory.units")}</option>
            <option value={20}>20 {t("inventory.units")}</option>
            <option value={50}>50 {t("inventory.units")}</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-[var(--brand-primary)]">
          <p className="text-sm font-medium text-gray-600">{t("inventory.totalProducts")}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary?.totalProducts || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{(summary?.totalUnits || 0).toLocaleString()} {t("inventory.totalUnits")}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">{t("inventory.outOfStock")}</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary?.outOfStock || 0}</p>
          <p className="text-xs text-red-500 mt-1">{t("inventory.requiresAttention")}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-gray-600">{t("inventory.lowStock")}</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{summary?.lowStock || 0}</p>
          <p className="text-xs text-yellow-500 mt-1">{t("inventory.below")} {threshold} {t("inventory.units")}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">{t("inventory.stockHealth")}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stockHealthPercent}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all ${
                stockHealthPercent > 75 ? "bg-green-500" : stockHealthPercent > 50 ? "bg-yellow-500" : "bg-red-500"
              }`}
              style={{ width: `${stockHealthPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Inventory Value */}
      <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/90 text-sm font-medium">{t("inventory.totalInventoryValue")}</p>
            <p className="text-3xl font-bold mt-1">
              {(summary?.totalValue || 0).toLocaleString()} <span className="text-lg font-normal">EGP</span>
            </p>
          </div>
          <div className="text-5xl opacity-30"><CubeIcon className="w-9 h-9" aria-hidden="true" /></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex-shrink-0 min-w-[120px] px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                  tab.color === "red" ? "bg-red-100 text-red-700" :
                  tab.color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                  "bg-orange-100 text-orange-700"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Product List for out-of-stock / low-stock */}
        {activeTab !== "urgent" ? (
          <div className="divide-y divide-gray-100">
            {currentProducts.length > 0 ? (
              currentProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img loading="lazy" decoding="async" src={product.image} alt={product.name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f3f4f6'/><text x='32' y='38' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'>No image</text></svg>"; }} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl"><CubeIcon className="w-5 h-5" aria-hidden="true" /></div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      {product.store} {product.sku ? `• SKU: ${product.sku}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${product.quantity === 0 ? "text-red-600" : "text-yellow-600"}`}>
                      {product.quantity} {t("inventory.units")}
                    </p>
                    <p className="text-xs text-gray-500">{product.price.toLocaleString()} EGP</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    product.quantity === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {product.quantity === 0 ? t("inventory.outOfStock") : t("inventory.lowStock")}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="text-4xl mb-3"><SparklesIcon className="w-9 h-9" aria-hidden="true" /></div>
                <p className="text-gray-500 font-medium">
                  {activeTab === "outOfStock" ? t("inventory.noOutOfStock") : t("inventory.noLowStock")}
                </p>
                <p className="text-sm text-gray-400 mt-1">{t("inventory.allHealthy")}</p>
              </div>
            )}
          </div>
        ) : (
          /* Urgent Restock Table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("inventory.colProduct")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("inventory.colCurrentStock")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("inventory.colSold30d")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("inventory.colVelocity")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("inventory.colUrgency")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {urgentRestock.map((item) => {
                  const daysRemaining = item.unitsSold > 0
                    ? Math.ceil((item.currentStock / (item.unitsSold / 30)))
                    : Infinity;
                  const urgency =
                    item.currentStock === 0 ? t("inventory.critical") :
                    daysRemaining <= 3 ? t("inventory.high") :
                    daysRemaining <= 7 ? t("inventory.medium") : t("inventory.low");
                  const urgencyColor =
                    item.currentStock === 0 ? "bg-red-100 text-red-700" :
                    daysRemaining <= 3 ? "bg-orange-100 text-orange-700" :
                    daysRemaining <= 7 ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700";

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.price.toLocaleString()} EGP</p>
                      </td>
                      <td className={`px-4 py-3 font-bold ${item.currentStock === 0 ? "text-red-600" : "text-yellow-600"}`}>
                        {item.currentStock}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.unitsSold}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {(item.unitsSold / 30).toFixed(1)}/{t("inventory.day")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${urgencyColor}`}>
                          {urgency}
                        </span>
                        {daysRemaining !== Infinity && daysRemaining <= 7 && (
                          <span className="text-xs text-gray-500 ml-2">~{daysRemaining}{t("inventory.daysLeft")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {urgentRestock.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <div className="text-3xl mb-2"><CheckCircleIcon className="w-7 h-7" aria-hidden="true" /></div>
                      {t("inventory.noUrgentRestock")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryAlertsPage;
