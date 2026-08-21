import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import type { User } from "../../types/user.type";
import { ClockIcon, PencilSquareIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import CategoryScopeModal from "../../components/admin/CategoryScopeModal";
import NewStaffModal from "../../components/admin/NewStaffModal";

const AdminsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
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
  /** Which account's categories are being edited, if any. */
  const [scopeFor, setScopeFor] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [categoryNames, setCategoryNames] = useState<Map<string, string>>(new Map());

  const [customDuration, setCustomDuration] = useState({
    days: "0",
    hours: "0",
    minutes: "0",
  });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      // The back office as a whole, not `role: "admin"`. A category manager
      // is staff — asking for administrators by name kept them off the only
      // page that can hand them their categories.
      const { data } = await axiosInstance.get("/users", {
        params: { staff: 1, limit: 200 },
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

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/categories", { params: { includeHidden: true } })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = data.data || data.categories || [];
        setCategoryNames(
          new Map(rows.map((c: any) => [String(c._id), ar && c.nameAr ? c.nameAr : c.name])),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ar]);

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

  /**
   * Suspend or reinstate an account.
   *
   * The way a staff member leaves. Deleting the row would take their audit
   * trail with it and orphan every price they ever set, so the account stays
   * and stops being able to log in.
   */
  const setActive = async (user: User, active: boolean) => {
    try {
      await axiosInstance.put(
        `/users/${active ? "activateUser" : "deactivateUser"}/${user._id}`,
      );
      setAdmins((prev) =>
        prev.map((a) => (a._id === user._id ? { ...a, active } : a)),
      );
      toast.success(
        active
          ? t("staff.reinstated", "Account reinstated")
          : t("staff.suspended", "Account suspended"),
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          t("staff.activeFailed", "Could not change the account"),
      );
    }
  };

  /**
   * What to print in the Categories cell.
   *
   * The names themselves while they fit — two is what the column holds —
   * then a count for the rest. An unscoped account reaches everything, which
   * is a statement about the whole catalogue rather than a list of it.
   */
  const scopeLabels = (account: User): string[] => {
    const ids = (account.categoryScope || []).map(String);
    if (!ids.length) return [t("admins.scopeAll", "Whole catalogue")];

    const named = ids.map((id) => categoryNames.get(id) || t("admins.scopeUnknown", "a removed category"));
    if (named.length <= 2) return named;
    return [...named.slice(0, 2), t("admins.scopeMore", "+{{count}} more", { count: named.length - 2 })];
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">{t("admins.title")}</h1>
          <p className="text-[#9E9E9E]">
            {t("admins.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#002B5B] text-white text-sm font-semibold hover:bg-[#001a3d]"
          >
            <PlusIcon className="w-4 h-4" />
            {t("staff.newTitle", "New staff account")}
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
                {t("admins.colRole", "Role")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                {t("admins.colExpiresAt")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                {t("admins.colRemaining")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                {t("admins.colCategories", "Categories")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                {t("admins.colActions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">
                  {t("admins.loading")}
                </td>
              </tr>
            )}
            {!loading && admins.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">
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
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {t(`roles.${admin.role}`, String(admin.role).replace(/_/g, " "))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {admin.role === "admin" ? formatExpiry(admin.adminExpiresAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {admin.role === "admin" ? formatRemaining(admin.adminExpiresAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {/*
                        Named, not counted. "1 category" says an account is
                        restricted without saying to what, which is the one
                        thing this column exists to answer — and styled as a
                        bare pill it read as a badge rather than the way in
                        to change it.
                      */}
                      <button
                        type="button"
                        onClick={() => setScopeFor(admin)}
                        title={t("admins.editScope", "Change the sections this account is responsible for")}
                        className="group flex max-w-[16rem] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-start text-xs font-semibold text-gray-700 transition-colors hover:border-[#002B5B] hover:bg-gray-50"
                      >
                        {scopeLabels(admin).map((label) => (
                          <span
                            key={label}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-800 group-hover:bg-white"
                          >
                            {label}
                          </span>
                        ))}
                        <PencilSquareIcon className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-[#002B5B]" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {admin.role === "admin" && (
                        <>
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
                          className="px-3 py-2 rounded-lg bg-gray-100 border text-sm font-semibold hover:bg-gray-200"
                        >
                          {t("admins.grantCustomDuration")}
                        </button>
                        <button
                          onClick={() => endNow(admin._id!)}
                          className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200"
                        >
                          {t("admins.endNow")}
                        </button>
                        </>
                        )}
                        {admin.role !== "super_admin" && (
                          <button
                            onClick={() => setActive(admin, !admin.active)}
                            className={
                              admin.active
                                ? "px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200"
                                : "px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-semibold hover:bg-green-200"
                            }
                          >
                            {admin.active
                              ? t("staff.suspend", "Suspend")
                              : t("staff.reinstate", "Reinstate")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {customModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md mx-4 rounded-xl shadow-lg border max-h-[90vh] overflow-y-auto">
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
      {creating && (
        <NewStaffModal
          onClose={() => setCreating(false)}
          onCreated={(user) => {
            setCreating(false);
            setAdmins((prev) => [user, ...prev]);
            // Straight on to the half that matters: an account with no
            // categories can see nothing, so never leave it at that.
            setScopeFor(user);
          }}
        />
      )}
      {scopeFor && (
        <CategoryScopeModal
          userId={scopeFor._id!}
          userLabel={scopeFor.name || scopeFor.email || ""}
          current={(scopeFor.categoryScope || []).map(String)}
          onClose={() => setScopeFor(null)}
          onSaved={(next) =>
            setAdmins((prev) =>
              prev.map((a) => (a._id === scopeFor._id ? { ...a, categoryScope: next } : a)),
            )
          }
        />
      )}
    </div>
  );
};

export default AdminsPage;
