import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import type { User } from "../../types/user.type";
import { ClockIcon, XMarkIcon } from "@heroicons/react/24/outline";

const AdminsPage: React.FC = () => {
  const { t } = useTranslation();
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<{ days: string; hours: string }>({
    days: "1",
    hours: "0",
  });
  const [customModal, setCustomModal] = useState<{
    open: boolean;
    userId?: string;
    name?: string;
  }>({ open: false });
  const [customDuration, setCustomDuration] = useState({
    days: "0",
    hours: "0",
    minutes: "0",
  });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/users", {
        params: { role: "admin" },
      });
      setAdmins(data.data || []);
    } catch (error) {
      console.error("Failed to load admins", error);
      toast.error(t("admins.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const grantTime = async (
    userId: string,
    daysNum: number,
    hoursNum: number,
    minutesNum = 0
  ) => {
    if (daysNum <= 0 && hoursNum <= 0 && minutesNum <= 0) {
      toast.error(t("admins.positiveDuration"));
      return;
    }
    try {
      await axiosInstance.put(`/users/adminTime/${userId}`, {
        days: daysNum,
        hours: hoursNum,
        minutes: minutesNum,
      });
      toast.success(t("admins.timeUpdated"));
      fetchAdmins();
    } catch (error: any) {
      console.error("Failed to set admin time", error);
      toast.error(error?.response?.data?.message || t("admins.setTimeFailed"));
    }
  };

  const endNow = async (userId: string) => {
    try {
      await axiosInstance.put(`/users/adminTimeEnd/${userId}`);
      toast.success(t("admins.accessEnded"));
      fetchAdmins();
    } catch (error: any) {
      console.error("Failed to end admin time", error);
      toast.error(error?.response?.data?.message || t("admins.endTimeFailed"));
    }
  };

  const formatExpiry = (date?: string) => {
    if (!date) return "No time set";
    const d = new Date(date);
    return d.toLocaleString();
  };

  const formatRemaining = (date?: string) => {
    if (!date) return "—";
    const diffMs = new Date(date).getTime() - Date.now();
    if (diffMs <= 0) return "Expired";
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">{t("admins.title")}</h1>
          <p className="text-[#9E9E9E]">
            {t("admins.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            className="w-20 border rounded-lg px-3 py-2 text-sm"
            value={duration.days}
            onChange={(e) =>
              setDuration((p) => ({ ...p, days: e.target.value }))
            }
            placeholder={t("admins.days")}
          />
          <input
            type="number"
            min="0"
            className="w-20 border rounded-lg px-3 py-2 text-sm"
            value={duration.hours}
            onChange={(e) =>
              setDuration((p) => ({ ...p, hours: e.target.value }))
            }
            placeholder={t("admins.hours")}
          />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ClockIcon className="w-5 h-5" />
            {t("admins.defaultGrantDuration")}
          </div>
          <button
            onClick={() =>
              setCustomModal({ open: true, userId: undefined, name: undefined })
            }
            className="px-3 py-2 rounded-lg bg-gray-100 border text-sm font-semibold hover:bg-gray-200"
          >
            {t("admins.grantCustomDuration")}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                {t("admins.colAdmin")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                {t("admins.colEmail")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                {t("admins.colExpiresAt")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                {t("admins.colRemaining")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                {t("admins.colActions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  {t("admins.loading")}
                </td>
              </tr>
            )}
            {!loading && admins.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-500">
                  {t("admins.noAdmins")}
                </td>
              </tr>
            )}
            {!loading &&
                admins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {admin.name || "Admin"}
                    </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {admin.email}
                  </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatExpiry(admin.adminExpiresAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatRemaining(admin.adminExpiresAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() =>
                          grantTime(
                            admin._id!,
                            Number(duration.days) || 0,
                            Number(duration.hours) || 0
                          )
                        }
                        className="px-3 py-2 rounded-lg bg-[#002B5B] text-white text-sm font-semibold hover:bg-[#001a3d]"
                      >
                        {t("admins.grantDefault")}
                      </button>
                      <button
                        onClick={() =>
                          setCustomModal({
                            open: true,
                            userId: admin._id,
                            name: admin.name || admin.email,
                          })
                        }
                        className="ml-2 px-3 py-2 rounded-lg bg-gray-100 border text-sm font-semibold hover:bg-gray-200"
                      >
                        {t("admins.grantCustomDuration")}
                      </button>
                      <button
                        onClick={() => endNow(admin._id!)}
                        className="ml-2 px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200"
                      >
                        {t("admins.endNow")}
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {customModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg border">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {t("admins.grantCustomDuration")} {customModal.name ? `${t("admins.to")} ${customModal.name}` : ""}
              </h3>
              <button
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => setCustomModal({ open: false })}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {t("admins.days")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={customDuration.days}
                    onChange={(e) =>
                      setCustomDuration((p) => ({ ...p, days: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {t("admins.hours")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={customDuration.hours}
                    onChange={(e) =>
                      setCustomDuration((p) => ({ ...p, hours: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    {t("admins.minutes")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={customDuration.minutes}
                    onChange={(e) =>
                      setCustomDuration((p) => ({
                        ...p,
                        minutes: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCustomModal({ open: false })}
                  className="px-3 py-2 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  {t("admins.cancel")}
                </button>
                <button
                  onClick={() => {
                    const d = Number(customDuration.days) || 0;
                    const h = Number(customDuration.hours) || 0;
                    const m = Number(customDuration.minutes) || 0;
                    if (!customModal.userId) {
                      toast.error(t("admins.noAdminSelected"));
                      return;
                    }
                    grantTime(customModal.userId, d, h, m);
                    setCustomModal({ open: false });
                  }}
                  className="px-3 py-2 rounded-lg bg-[#002B5B] text-white text-sm font-semibold hover:bg-[#001a3d]"
                >
                  {t("admins.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminsPage;
