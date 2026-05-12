import React, { useEffect, useState, useCallback } from "react";
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
    { id: "outOfStock" as const, label: "Out of Stock", count: summary?.outOfStock || 0, color: "red" },
    { id: "lowStock" as const, label: "Low Stock", count: summary?.lowStock || 0, color: "yellow" },
    { id: "urgent" as const, label: "Urgent Restock", count: urgentRestock.length, color: "orange" },
  ];

  const currentProducts = activeTab === "outOfStock" ? outOfStock : activeTab === "lowStock" ? lowStock : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Alerts</h1>
          <p className="text-sm text-gray-600">Monitor stock levels and get restocking recommendations</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 whitespace-nowrap">Low stock threshold:</label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value={5}>5 units</option>
            <option value={10}>10 units</option>
            <option value={20}>20 units</option>
            <option value={50}>50 units</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Total Products</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary?.totalProducts || 0}</p>
          <p className="text-xs text-gray-500 mt-1">{(summary?.totalUnits || 0).toLocaleString()} total units</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-600">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary?.outOfStock || 0}</p>
          <p className="text-xs text-red-500 mt-1">Requires immediate attention</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-gray-600">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{summary?.lowStock || 0}</p>
          <p className="text-xs text-yellow-500 mt-1">Below {threshold} units</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-lg border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">Stock Health</p>
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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Total Inventory Value</p>
            <p className="text-3xl font-bold mt-1">
              {(summary?.totalValue || 0).toLocaleString()} <span className="text-lg font-normal">EGP</span>
            </p>
          </div>
          <div className="text-5xl opacity-30">📦</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
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
                      <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
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
                      {product.quantity} units
                    </p>
                    <p className="text-xs text-gray-500">{product.price.toLocaleString()} EGP</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    product.quantity === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {product.quantity === 0 ? "Out of Stock" : "Low Stock"}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-gray-500 font-medium">
                  {activeTab === "outOfStock" ? "No out-of-stock products!" : "No low-stock products!"}
                </p>
                <p className="text-sm text-gray-400 mt-1">All products have healthy stock levels</p>
              </div>
            )}
          </div>
        ) : (
          /* Urgent Restock Table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Current Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sold (30d)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Velocity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {urgentRestock.map((item) => {
                  const daysRemaining = item.unitsSold > 0
                    ? Math.ceil((item.currentStock / (item.unitsSold / 30)))
                    : Infinity;
                  const urgency =
                    item.currentStock === 0 ? "Critical" :
                    daysRemaining <= 3 ? "High" :
                    daysRemaining <= 7 ? "Medium" : "Low";
                  const urgencyColor =
                    urgency === "Critical" ? "bg-red-100 text-red-700" :
                    urgency === "High" ? "bg-orange-100 text-orange-700" :
                    urgency === "Medium" ? "bg-yellow-100 text-yellow-700" :
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
                        {(item.unitsSold / 30).toFixed(1)}/day
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${urgencyColor}`}>
                          {urgency}
                        </span>
                        {daysRemaining !== Infinity && daysRemaining <= 7 && (
                          <span className="text-xs text-gray-500 ml-2">~{daysRemaining}d left</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {urgentRestock.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <div className="text-3xl mb-2">✅</div>
                      No urgent restocking needed
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
