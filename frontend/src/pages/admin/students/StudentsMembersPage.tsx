import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useStudentStore, type StudentStatus } from "../../../stores/student.store";
import { Card, PageHead, STATUS_TONE, btnGhost, inputCls } from "./shared";

/** Everyone who applied, and the three decisions available on each of them. */

const StudentsMembersPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    members,
    membersTotal,
    membersPages,
    loading,
    saving,
    fetchMembers,
    setMemberStatus,
    fetchStats,
    runMaintenance,
  } = useStudentStore();

  const [filter, setFilter] = useState({ status: "", search: "", page: 1 });

  useEffect(() => {
    fetchMembers({
      page: filter.page,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search ? { search: filter.search } : {}),
    });
  }, [fetchMembers, filter]);

  const act = async (id: string, status: StudentStatus) => {
    let reason: string | undefined;
    if (status === "rejected") {
      reason =
        window.prompt(t("Why is this application rejected? The student sees this.") as string) ||
        undefined;
      if (!reason) return;
    }
    if (await setMemberStatus(id, status, reason)) {
      toast.success(t("Member updated."));
      fetchMembers({ page: filter.page, ...(filter.status ? { status: filter.status } : {}) });
      fetchStats();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <PageHead title={t("Members")} description={`${membersTotal} ${t("applications in total")}`}>
        <button
          onClick={async () => {
            if (await runMaintenance()) {
              toast.success(t("Renewals rolled and expiries applied."));
              fetchMembers({ page: filter.page });
              fetchStats();
            }
          }}
          disabled={saving}
          className={btnGhost}
        >
          {t("Run renewals now")}
        </button>
      </PageHead>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            className={`${inputCls} max-w-[200px]`}
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value, page: 1 })}
          >
            <option value="">{t("All statuses")}</option>
            <option value="pending">{t("Pending")}</option>
            <option value="verified">{t("Verified")}</option>
            <option value="rejected">{t("Rejected")}</option>
            <option value="suspended">{t("Suspended")}</option>
            <option value="expired">{t("Expired")}</option>
          </select>
          <input
            className={`${inputCls} max-w-[280px]`}
            placeholder={t("Search email or university") as string}
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value, page: 1 })}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-start text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="text-start py-2 font-semibold">{t("Student")}</th>
                <th className="text-start py-2 font-semibold">{t("University email")}</th>
                <th className="text-start py-2 font-semibold">{t("Status")}</th>
                <th className="text-start py-2 font-semibold">{t("Code")}</th>
                <th className="text-start py-2 font-semibold">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m._id} className="border-b border-[var(--border)]/60">
                  <td className="py-3">
                    <div className="font-semibold text-[var(--text)]">{m.user?.name || "—"}</div>
                    <div className="text-xs text-[var(--text-muted)]" dir="ltr">
                      {m.user?.email}
                    </div>
                  </td>
                  <td className="py-3 font-mono text-xs" dir="ltr">
                    {m.universityEmail}
                    <div className="text-[var(--text-muted)]">{m.university}</div>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${STATUS_TONE[m.status]}`}>
                      {t(m.status)}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-xs" dir="ltr">
                    {m.coupon?.code || "—"}
                    {m.coupon && (
                      <div className="text-[var(--text-muted)]">
                        {m.coupon.usageCount}/{m.coupon.usageLimit ?? "∞"}
                      </div>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {m.status !== "verified" && (
                        <button
                          onClick={() => act(m._id, "verified")}
                          className="text-xs px-2.5 py-1.5 rounded border border-[var(--border)] hover:border-[var(--success)] text-[var(--text)]"
                        >
                          {t("Approve")}
                        </button>
                      )}
                      {m.status !== "suspended" && (
                        <button
                          onClick={() => act(m._id, "suspended")}
                          className="text-xs px-2.5 py-1.5 rounded border border-[var(--border)] hover:border-[var(--danger)] text-[var(--text)]"
                        >
                          {t("Suspend")}
                        </button>
                      )}
                      {m.status === "pending" && (
                        <button
                          onClick={() => act(m._id, "rejected")}
                          className="text-xs px-2.5 py-1.5 rounded border border-[var(--border)] hover:border-[var(--danger)] text-[var(--text)]"
                        >
                          {t("Reject")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!members.length && !loading && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--text-muted)]">
                    {t("No applications yet.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {membersPages > 1 && (
          <div className="flex items-center gap-2 mt-4">
            <button
              disabled={filter.page <= 1}
              onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
              className="px-3 py-1.5 rounded border border-[var(--border)] text-sm disabled:opacity-40"
            >
              {t("Previous")}
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              {filter.page} / {membersPages}
            </span>
            <button
              disabled={filter.page >= membersPages}
              onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
              className="px-3 py-1.5 rounded border border-[var(--border)] text-sm disabled:opacity-40"
            >
              {t("Next")}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentsMembersPage;
