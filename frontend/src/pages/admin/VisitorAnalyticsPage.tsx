import React, { useState, useEffect } from "react";
import {
  FiUsers,
  FiEye,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiMapPin,
  FiGlobe,
  FiClock,
  FiTrendingUp,
  FiBarChart2,
  FiRefreshCw,
} from "react-icons/fi";
import { axiosInstance as api } from "../../lib/axios";

interface VisitorStatsData {
  totalVisitors: number;
  totalPageViews: number;
  todayVisitors: number;
  avgPagesPerVisit: number;
  visitorsOverTime: Array<{ _id: string; count: number; pageViews: number }>;
}

interface DeviceData {
  devices: Array<{ _id: string; count: number }>;
  browsers: Array<{ _id: string; count: number }>;
  operatingSystems: Array<{ _id: string; count: number }>;
}

interface LocationData {
  countries: Array<{ _id: string; count: number }>;
  governorates: Array<{ _id: string; count: number }>;
  cities: Array<{ _id: { city: string; country: string }; count: number }>;
}

interface TopPagesData {
  topPages: Array<{ _id: string; views: number; uniqueVisitors: number }>;
}

const VisitorAnalyticsPage: React.FC = () => {
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VisitorStatsData | null>(null);
  const [devices, setDevices] = useState<DeviceData | null>(null);
  const [locations, setLocations] = useState<LocationData | null>(null);
  const [topPages, setTopPages] = useState<TopPagesData | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, devicesRes, locationsRes, pagesRes] = await Promise.all([
        api.get(`/analytics/visitors/stats?period=${period}`),
        api.get(`/analytics/visitors/devices?period=${period}`),
        api.get(`/analytics/visitors/locations?period=${period}`),
        api.get(`/analytics/visitors/pages?period=${period}`),
      ]);
      setStats(statsRes.data.data);
      setDevices(devicesRes.data.data);
      setLocations(locationsRes.data.data);
      setTopPages(pagesRes.data.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const deviceIcon = (type: string) => {
    switch (type) {
      case "mobile":
        return <FiSmartphone />;
      case "tablet":
        return <FiTablet />;
      default:
        return <FiMonitor />;
    }
  };

  const deviceColors: Record<string, string> = {
    desktop: "#3B82F6",
    mobile: "#10B981",
    tablet: "#F59E0B",
    unknown: "#6B7280",
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin text-4xl text-blue-500">
          <FiRefreshCw />
        </div>
      </div>
    );
  }

  const totalDevices =
    devices?.devices?.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Visitor Analytics
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track visitors, devices, and locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={fetchData}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700 transition"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FiUsers />}
          label="Total Visitors"
          value={stats?.totalVisitors || 0}
          color="#3B82F6"
        />
        <StatCard
          icon={<FiEye />}
          label="Page Views"
          value={stats?.totalPageViews || 0}
          color="#10B981"
        />
        <StatCard
          icon={<FiClock />}
          label="Today's Visitors"
          value={stats?.todayVisitors || 0}
          color="#F59E0B"
        />
        <StatCard
          icon={<FiTrendingUp />}
          label="Avg Pages/Visit"
          value={stats?.avgPagesPerVisit || 0}
          color="#8B5CF6"
        />
      </div>

      {/* Visitors Over Time Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FiBarChart2 /> Visitors Over Time
        </h2>
        {stats?.visitorsOverTime && stats.visitorsOverTime.length > 0 ? (
          <div className="h-64 flex items-end gap-1 overflow-x-auto pb-6 relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-xs text-gray-400">
              <span>
                {Math.max(...stats.visitorsOverTime.map((v) => v.count))}
              </span>
              <span>0</span>
            </div>
            <div className="flex items-end gap-1 ml-12 flex-1">
              {stats.visitorsOverTime.map((day, i) => {
                const maxCount = Math.max(
                  ...stats.visitorsOverTime.map((v) => v.count)
                );
                const height =
                  maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                return (
                  <div
                    key={day._id}
                    className="flex flex-col items-center flex-1 min-w-[20px] group"
                  >
                    <div className="relative w-full">
                      <div
                        className="bg-blue-500 hover:bg-blue-600 rounded-t-sm w-full transition-all cursor-pointer"
                        style={{ height: `${Math.max(height * 2, 2)}px` }}
                        title={`${day._id}: ${day.count} visitors, ${day.pageViews} views`}
                      />
                      {/* Tooltip */}
                      <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {day._id.slice(5)}: {day.count} visitors
                      </div>
                    </div>
                    {i % Math.ceil(stats.visitorsOverTime.length / 10) ===
                      0 && (
                      <span className="text-xs text-gray-400 mt-1 -rotate-45 origin-top-left">
                        {day._id.slice(5)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState message="No visitor data yet. Data will appear as visitors browse the store." />
        )}
      </div>

      {/* Device & Browser Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiMonitor /> Devices
          </h2>
          {devices?.devices && devices.devices.length > 0 ? (
            <div className="space-y-4">
              {devices.devices.map((d) => {
                const pct = ((d.count / totalDevices) * 100).toFixed(1);
                return (
                  <div key={d._id} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {deviceIcon(d._id)} {d._id || "Unknown"}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {d.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            deviceColors[d._id] || deviceColors.unknown,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No device data yet" />
          )}
        </div>

        {/* Browser Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Browsers
          </h2>
          {devices?.browsers && devices.browsers.length > 0 ? (
            <div className="space-y-3">
              {devices.browsers.slice(0, 8).map((b, i) => (
                <div
                  key={b._id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {b._id || "Unknown"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No browser data yet" />
          )}
        </div>

        {/* OS Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Operating Systems
          </h2>
          {devices?.operatingSystems && devices.operatingSystems.length > 0 ? (
            <div className="space-y-3">
              {devices.operatingSystems.slice(0, 8).map((os) => (
                <div
                  key={os._id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {os._id || "Unknown"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {os.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No OS data yet" />
          )}
        </div>
      </div>

      {/* Location Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiGlobe /> Countries
          </h2>
          {locations?.countries && locations.countries.length > 0 ? (
            <div className="space-y-3">
              {locations.countries.map((c) => (
                <div
                  key={c._id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {c._id || "Unknown"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No location data yet" />
          )}
        </div>

        {/* Egyptian Governorates */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiMapPin /> Egyptian Governorates
          </h2>
          {locations?.governorates && locations.governorates.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {locations.governorates.map((g) => (
                <div
                  key={g._id}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {g._id || "Unknown"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                    {g.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No Egyptian visitor data yet. Governorate data appears when visitors from Egypt browse your store." />
          )}
        </div>
      </div>

      {/* Top Pages */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top Pages
        </h2>
        {topPages?.topPages && topPages.topPages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Page</th>
                  <th className="pb-3 font-medium text-right">Views</th>
                  <th className="pb-3 font-medium text-right">
                    Unique Visitors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {topPages.topPages.map((page) => (
                  <tr key={page._id}>
                    <td className="py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                      {page._id}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                      {page.views}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {page.uniqueVisitors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No page view data yet" />
        )}
      </div>
    </div>
  );
};

// Helper components
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          {typeof value === "number" && value % 1 !== 0
            ? value.toFixed(1)
            : value.toLocaleString()}
        </p>
      </div>
      <div
        className="p-3 rounded-lg text-xl"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
    </div>
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="text-4xl mb-3 text-gray-300">📊</div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);

export default VisitorAnalyticsPage;
