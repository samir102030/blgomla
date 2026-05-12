import React, { useEffect, useState, useCallback } from "react";
import { axiosInstance } from "../../lib/axios";

interface PaymentSummary {
  totalPaid: number;
  paidOrders: number;
  totalPending: number;
  pendingOrders: number;
}

interface MethodBreakdown {
  method: string;
  count: number;
  total: number;
  paidCount: number;
  successRate: number;
}

interface PaymentTrendPoint {
  date: string;
  total: number;
  count: number;
}

interface RecentPayment {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
  status: string;
  customer: string;
  email: string;
  transactionId: string | null;
}

const PaymentManagementPage: React.FC = () => {
  const [period, setPeriod] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [methods, setMethods] = useState<MethodBreakdown[]>([]);
  const [trend, setTrend] = useState<PaymentTrendPoint[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/analytics/payments", {
        params: { period },
      });
      if (data.success) {
        setSummary(data.data.summary);
        setMethods(data.data.methodBreakdown);
        setTrend(data.data.paymentTrend);
        setRecentPayments(data.data.recentPayments);
      }
    } catch (err) {
      console.error("Failed to fetch payment analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const methodLabels: Record<string, { label: string; icon: string; color: string }> = {
    cod: { label: "Cash on Delivery", icon: "💵", color: "from-emerald-500 to-emerald-600" },
    stripe: { label: "Stripe", icon: "💳", color: "from-indigo-500 to-indigo-600" },
    paymob: { label: "Paymob", icon: "🏦", color: "from-blue-500 to-blue-600" },
    unknown: { label: "Unknown", icon: "❓", color: "from-gray-400 to-gray-500" },
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const maxTrend = Math.max(...(trend.map((t) => t.total) || [1]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-sm text-gray-600">Track payment methods, transactions, and success rates</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-green-100 text-sm font-medium">Total Collected</p>
          <p className="text-2xl font-bold mt-1">
            {(summary?.totalPaid || 0).toLocaleString()} <span className="text-sm font-normal">EGP</span>
          </p>
          <p className="text-green-200 text-xs mt-2">{summary?.paidOrders || 0} paid orders</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-yellow-100 text-sm font-medium">Pending Payments</p>
          <p className="text-2xl font-bold mt-1">
            {(summary?.totalPending || 0).toLocaleString()} <span className="text-sm font-normal">EGP</span>
          </p>
          <p className="text-yellow-200 text-xs mt-2">{summary?.pendingOrders || 0} awaiting payment</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-blue-100 text-sm font-medium">Payment Methods</p>
          <p className="text-2xl font-bold mt-1">{methods.length}</p>
          <p className="text-blue-200 text-xs mt-2">Active gateways</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
          <p className="text-purple-100 text-sm font-medium">Avg Success Rate</p>
          <p className="text-2xl font-bold mt-1">
            {methods.length > 0
              ? Math.round(methods.reduce((a, m) => a + m.successRate, 0) / methods.length)
              : 0}
            %
          </p>
          <p className="text-purple-200 text-xs mt-2">Across all methods</p>
        </div>
      </div>

      {/* Method Breakdown + Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Method Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="space-y-4">
            {methods.map((m) => {
              const meta = methodLabels[m.method] || methodLabels.unknown;
              const percent = summary && summary.totalPaid > 0 ? (m.total / summary.totalPaid) * 100 : 0;
              return (
                <div key={m.method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{meta.label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {m.total.toLocaleString()} EGP
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${meta.color} h-2 rounded-full transition-all`}
                      style={{ width: `${Math.max(percent, 2)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{m.count} orders</span>
                    <span>{m.successRate}% success rate</span>
                  </div>
                </div>
              );
            })}
            {methods.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No payment data yet</p>
            )}
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Trend</h3>
          {trend.length > 0 ? (
            <div className="h-64 flex items-end gap-1">
              {trend.map((point, i) => {
                const height = maxTrend > 0 ? (point.total / maxTrend) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="relative w-full flex items-end justify-center">
                      <div
                        className="rounded-t w-full bg-gradient-to-t from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 transition-all"
                        style={{ height: `${Math.max(height, 3)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-gray-900 text-white px-2 py-1 rounded shadow whitespace-nowrap z-10">
                          {point.total.toLocaleString()} EGP • {point.count} orders
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
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No payment data for this period
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentPayments.map((p) => {
                const meta = methodLabels[p.method] || methodLabels.unknown;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{p.customer}</p>
                        <p className="text-xs text-gray-500">{p.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {p.amount.toLocaleString()} EGP
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <span>{meta.icon}</span>
                        <span className="text-gray-700">{meta.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || "bg-gray-100 text-gray-700"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {p.transactionId ? p.transactionId.slice(0, 16) + "…" : "—"}
                    </td>
                  </tr>
                );
              })}
              {recentPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No payments found
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

export default PaymentManagementPage;
