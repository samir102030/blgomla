import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../../lib/axios";

interface CustomerSummary {
  totalUsers: number;
  newUsers: number;
  verifiedUsers: number;
  verificationRate: number;
}

interface Retention {
  totalBuyers: number;
  repeatBuyers: number;
  oneTimeBuyers: number;
  retentionRate: number;
}

interface TrendPoint {
  date: string;
  count: number;
}

interface TopCustomer {
  name: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
}

interface FrequencyBucket {
  bucket: string;
  count: number;
}

const CustomerAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [retention, setRetention] = useState<Retention | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [frequency, setFrequency] = useState<FrequencyBucket[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/analytics/customers", {
        params: { period },
      });
      if (data.success) {
        setSummary(data.data.summary);
        setRetention(data.data.retention);
        setTrend(data.data.registrationTrend);
        setTopCustomers(data.data.topCustomers);
        setFrequency(data.data.orderFrequency);
      }
    } catch (err) {
      console.error("Failed to fetch customer analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--brand-primary)] border-t-transparent" />
      </div>
    );
  }

  const maxTrend = Math.max(...(trend.map((t) => t.count) || [1]));
  const maxFrequency = Math.max(...(frequency.map((f) => f.count) || [1]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("customerAnalytics.title")}</h1>
          <p className="text-sm text-gray-600">{t("customerAnalytics.subtitle")}</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
        >
          <option value="7days">{t("customerAnalytics.last7days")}</option>
          <option value="30days">{t("customerAnalytics.last30days")}</option>
          <option value="90days">{t("customerAnalytics.last90days")}</option>
          <option value="1year">{t("customerAnalytics.lastYear")}</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/90 text-sm font-medium">{t("customerAnalytics.totalCustomers")}</p>
          <p className="text-2xl font-bold mt-1">{(summary?.totalUsers || 0).toLocaleString()}</p>
          <p className="text-white/90 text-xs mt-2">{summary?.verificationRate || 0}% {t("customerAnalytics.verified")}</p>
        </div>
        <div className="bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] rounded-xl p-5 text-white shadow-lg">
          <p className="text-white/90 text-sm font-medium">{t("customerAnalytics.newCustomers")}</p>
          <p className="text-2xl font-bold mt-1">{summary?.newUsers || 0}</p>
          <p className="text-white/90 text-xs mt-2">{t("customerAnalytics.inSelectedPeriod")}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-green-100 text-sm font-medium">{t("customerAnalytics.repeatBuyers")}</p>
          <p className="text-2xl font-bold mt-1">{retention?.repeatBuyers || 0}</p>
          <p className="text-green-200 text-xs mt-2">
            {retention?.retentionRate || 0}% {t("customerAnalytics.retentionRate")}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-orange-100 text-sm font-medium">{t("customerAnalytics.activeBuyers")}</p>
          <p className="text-2xl font-bold mt-1">{retention?.totalBuyers || 0}</p>
          <p className="text-orange-200 text-xs mt-2">{t("customerAnalytics.madeAtLeast1Order")}</p>
        </div>
      </div>

      {/* Retention Ring + Frequency Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention Visual */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{t("customerAnalytics.customerRetention")}</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
            {/* Ring Chart */}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#retentionGradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(retention?.retentionRate || 0) * 2.64} 264`}
                />
                <defs>
                  <linearGradient id="retentionGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{retention?.retentionRate || 0}%</span>
                <span className="text-xs text-gray-500">{t("customerAnalytics.retention")}</span>
              </div>
            </div>
            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">
                  {t("customerAnalytics.repeatBuyersLabel")}: <strong>{retention?.repeatBuyers || 0}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-sm text-gray-700">
                  {t("customerAnalytics.oneTimeBuyers")}: <strong>{retention?.oneTimeBuyers || 0}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--brand-primary)]" />
                <span className="text-sm text-gray-700">
                  {t("customerAnalytics.totalBuyers")}: <strong>{retention?.totalBuyers || 0}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Frequency */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{t("customerAnalytics.orderFrequency")}</h3>
          <div className="space-y-4">
            {frequency.map((bucket) => {
              const percent = maxFrequency > 0 ? (bucket.count / maxFrequency) * 100 : 0;
              return (
                <div key={bucket.bucket} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">{bucket.bucket}</span>
                    <span className="text-gray-500">{bucket.count} {t("customerAnalytics.customers")}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] h-3 rounded-full transition-all"
                      style={{ width: `${Math.max(percent, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {frequency.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">{t("customerAnalytics.noOrderData")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Registration Trend */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("customerAnalytics.registrationTrend")}</h3>
        {trend.length > 0 ? (
          <div className="h-48 flex items-end gap-1">
            {trend.map((point, i) => {
              const height = maxTrend > 0 ? (point.count / maxTrend) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="relative w-full flex items-end justify-center">
                    <div
                      className="rounded-t w-full bg-gradient-to-t from-[var(--brand-primary)] to-[var(--brand-accent)] hover:from-[var(--brand-primary)] hover:to-[var(--brand-accent)] transition-all"
                      style={{ height: `${Math.max(height, 3)}%` }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-gray-900 text-white px-2 py-1 rounded shadow whitespace-nowrap z-10">
                        {point.count} {t("customerAnalytics.newUsers")} • {point.date.slice(5)}
                      </div>
                    </div>
                  </div>
                  {i % Math.ceil(trend.length / 7) === 0 && (
                    <span className="text-[9px] text-gray-400 mt-1">{point.date.slice(5)}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            {t("customerAnalytics.noRegistrationData")}
          </div>
        )}
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t("customerAnalytics.topCustomers")}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("customerAnalytics.colCustomer")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("customerAnalytics.colTotalSpent")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("customerAnalytics.colOrders")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("customerAnalytics.colAOV")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{t("customerAnalytics.colTier")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topCustomers.map((customer, index) => {
                const tier =
 customer.totalSpent >= 10000 ? ` ${t("customerAnalytics.tierVIP")}` :
 customer.totalSpent >= 5000 ? ` ${t("customerAnalytics.tierPremium")}` :
 customer.totalSpent >= 1000 ? ` ${t("customerAnalytics.tierRegular")}` : t("customerAnalytics.tierStandard");
                const tierColor =
                  customer.totalSpent >= 10000 ? "bg-yellow-100 text-yellow-800" :
                  customer.totalSpent >= 5000 ? "bg-gray-100 text-gray-700" :
                  customer.totalSpent >= 1000 ? "bg-orange-100 text-orange-700" :
                  "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]";

                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${
                        index < 3 ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "text-gray-500"
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.email}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {customer.totalSpent.toLocaleString()} EGP
                    </td>
                    <td className="px-4 py-3 text-gray-700">{customer.orderCount}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {customer.avgOrderValue.toLocaleString()} EGP
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierColor}`}>
                        {tier}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {topCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {t("customerAnalytics.noCustomerData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalyticsPage;
