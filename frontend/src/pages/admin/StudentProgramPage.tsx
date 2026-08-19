import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  useStudentStore,
  type Faculty,
  type ProgramSettings,
  type StudentStatus,
} from "../../stores/student.store";
import { useCategoryStore } from "../../stores/category.store";

/**
 * The student programme, dashboard side.
 *
 * Four things live here and nothing else does: who qualifies (the domains),
 * what they get (the discount and its renewal), what it applies to (the
 * category scope), and who is in (the member list). They are on one screen
 * because changing any of them without seeing the others is how a programme
 * ends up giving 40% off servers to the whole university.
 */

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]";

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <label className="block mb-4">
    <span className="block text-sm font-semibold text-[var(--text)] mb-1">{label}</span>
    {children}
    {hint && <span className="block text-xs text-[var(--text-muted)] mt-1">{hint}</span>}
  </label>
);

const Card: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 mb-5">
    <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>
    {description && <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">{description}</p>}
    {children}
  </section>
);

const STATUS_TONE: Record<StudentStatus, string> = {
  verified: "bg-[var(--success-bg)] text-[var(--success)]",
  pending: "bg-[var(--warning-bg)] text-[var(--warning)]",
  rejected: "bg-[var(--danger-bg)] text-[var(--danger)]",
  suspended: "bg-[var(--danger-bg)] text-[var(--danger)]",
  expired: "bg-[var(--surface-2)] text-[var(--text-muted)]",
};

const StudentProgramPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const {
    settings,
    members,
    membersTotal,
    membersPages,
    stats,
    loading,
    saving,
    error,
    fetchSettings,
    saveSettings,
    addDomain,
    updateDomain,
    removeDomain,
    fetchMembers,
    setMemberStatus,
    fetchStats,
    runMaintenance,
    clearError,
  } = useStudentStore();

  const categories = useCategoryStore((s) => s.categories);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);

  const [draft, setDraft] = useState<Partial<ProgramSettings>>({});
  const [newDomain, setNewDomain] = useState({
    domain: "",
    university: "",
    universityAr: "",
    faculty: "engineering" as Faculty,
  });
  const [filter, setFilter] = useState<{ status: string; search: string; page: number }>({
    status: "",
    search: "",
    page: 1,
  });

  useEffect(() => {
    fetchSettings();
    fetchStats();
    if (!categories.length) fetchCategories();
  }, [fetchSettings, fetchStats, fetchCategories, categories.length]);

  useEffect(() => {
    fetchMembers({
      page: filter.page,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search ? { search: filter.search } : {}),
    });
  }, [fetchMembers, filter]);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (error) {
      // The server writes these in English; `t` swaps in the Arabic where
      // there is one and returns the key untouched where there is not.
      toast.error(t(error));
      clearError();
    }
  }, [error, clearError, t]);

  /** Root categories only — the scope is picked at department level and the
   *  server expands each to its whole subtree when it mints a code. */
  const roots = useMemo(
    () => (categories || []).filter((c: any) => !c.parentCategory),
    [categories],
  );

  const scopeIds = useMemo(
    () => new Set((draft.categories || []).map((c: any) => String(c?._id || c))),
    [draft.categories],
  );

  const toggleScope = (id: string) => {
    const next = new Set(scopeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDraft((d) => ({ ...d, categories: [...next] }));
  };

  const onSave = async () => {
    const okDone = await saveSettings({
      enabled: draft.enabled,
      discount: draft.discount,
      renewal: draft.renewal,
      membershipDays: draft.membershipDays,
      categories: [...scopeIds] as any,
    });
    if (okDone) toast.success(t("Programme settings saved."));
  };

  const onAddDomain = async () => {
    if (!newDomain.domain.trim()) return;
    if (await addDomain(newDomain)) {
      toast.success(t("Domain added."));
      setNewDomain({ domain: "", university: "", universityAr: "", faculty: "engineering" });
    }
  };

  const onMemberAction = async (id: string, status: StudentStatus) => {
    let reason: string | undefined;
    if (status === "rejected") {
      reason = window.prompt(t("Why is this application rejected? The student sees this.") as string) || undefined;
      if (!reason) return;
    }
    if (await setMemberStatus(id, status, reason)) {
      toast.success(t("Member updated."));
      fetchMembers({ page: filter.page, ...(filter.status ? { status: filter.status } : {}) });
      fetchStats();
    }
  };

  const statCells: Array<[string, number | undefined]> = [
    [t("Verified"), stats?.verified],
    [t("Pending"), stats?.pending],
    [t("Suspended"), stats?.suspended],
    [t("Expired"), stats?.expired],
    [t("Codes issued"), stats?.codesIssued],
    [t("Redemptions"), stats?.redemptions],
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">{t("Student programme")}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {t(
            "A discount for engineering and computer science students, proven by a faculty email address. Everything the programme does is set here.",
          )}
        </p>
      </header>

      {/* ── Figures ── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {statCells.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-2xl font-bold text-[var(--text)] font-mono">{value ?? "—"}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── The offer ── */}
      <Card
        title={t("The offer")}
        description={t("What a verified student gets, and how often it comes back.")}
      >
        <label className="flex items-center gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!draft.enabled}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            className="w-5 h-5 accent-[var(--brand-primary)]"
          />
          <span className="text-sm font-semibold text-[var(--text)]">
            {t("Programme open to applications")}
          </span>
        </label>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-4">
          <Field label={t("Discount type")}>
            <select
              className={inputCls}
              value={draft.discount?.type || "percentage"}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  discount: { ...(d.discount as any), type: e.target.value as "percentage" | "fixed" },
                }))
              }
            >
              <option value="percentage">{t("Percentage")}</option>
              <option value="fixed">{t("Fixed amount")}</option>
            </select>
          </Field>

          <Field label={t("Value")}>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={draft.discount?.value ?? 0}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  discount: { ...(d.discount as any), value: Number(e.target.value) },
                }))
              }
            />
          </Field>

          <Field label={t("Maximum discount")} hint={t("Caps a percentage. Leave empty for no cap.")}>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={draft.discount?.maximumDiscount ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  discount: {
                    ...(d.discount as any),
                    maximumDiscount: e.target.value === "" ? undefined : Number(e.target.value),
                  },
                }))
              }
            />
          </Field>

          <Field label={t("Minimum order")}>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={draft.discount?.minimumPurchase ?? 0}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  discount: { ...(d.discount as any), minimumPurchase: Number(e.target.value) },
                }))
              }
            />
          </Field>

          <Field label={t("Orders per period")}>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={draft.renewal?.usesPerPeriod ?? 1}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  renewal: { ...(d.renewal as any), usesPerPeriod: Number(e.target.value) },
                }))
              }
            />
          </Field>

          <Field label={t("Period length (days)")} hint={t("The code resets after this many days.")}>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={draft.renewal?.periodDays ?? 30}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  renewal: { ...(d.renewal as any), periodDays: Number(e.target.value) },
                }))
              }
            />
          </Field>

          <Field label={t("Membership length (days)")}>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={draft.membershipDays ?? 365}
              onChange={(e) => setDraft((d) => ({ ...d, membershipDays: Number(e.target.value) }))}
            />
          </Field>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-2 px-5 py-2.5 rounded-lg bg-[var(--brand-primary)] text-white font-semibold disabled:opacity-50"
        >
          {saving ? t("Saving…") : t("Save settings")}
        </button>
      </Card>

      {/* ── Scope ── */}
      <Card
        title={t("What the discount applies to")}
        description={t(
          "Pick departments. Every subcategory beneath one is included automatically. Selecting nothing means the whole catalogue.",
        )}
      >
        <div className="flex flex-wrap gap-2">
          {roots.map((c: any) => {
            const on = scopeIds.has(String(c._id));
            return (
              <button
                key={c._id}
                type="button"
                onClick={() => toggleScope(String(c._id))}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                  on
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--text)] font-semibold"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {isAr && c.nameAr ? c.nameAr : c.name}
              </button>
            );
          })}
          {!roots.length && (
            <span className="text-sm text-[var(--text-muted)]">{t("Categories are still loading.")}</span>
          )}
        </div>
      </Card>

      {/* ── Domains ── */}
      <Card
        title={t("Approved faculty domains")}
        description={t(
          "A faculty domain is the whole proof of enrolment. A university-wide domain would admit every faculty, so add the faculty address, not the university one.",
        )}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-x-3 items-end mb-4">
          <Field label={t("Domain")}>
            <input
              className={inputCls}
              dir="ltr"
              placeholder="eng.cu.edu.eg"
              value={newDomain.domain}
              onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
            />
          </Field>
          <Field label={t("University (English)")}>
            <input
              className={inputCls}
              value={newDomain.university}
              onChange={(e) => setNewDomain({ ...newDomain, university: e.target.value })}
            />
          </Field>
          <Field label={t("University (Arabic)")}>
            <input
              className={inputCls}
              value={newDomain.universityAr}
              onChange={(e) => setNewDomain({ ...newDomain, universityAr: e.target.value })}
            />
          </Field>
          <Field label={t("Faculty")}>
            <select
              className={inputCls}
              value={newDomain.faculty}
              onChange={(e) => setNewDomain({ ...newDomain, faculty: e.target.value as Faculty })}
            >
              <option value="engineering">{t("Engineering")}</option>
              <option value="computer_science">{t("Computer science")}</option>
              <option value="other">{t("Other")}</option>
            </select>
          </Field>
          <button
            onClick={onAddDomain}
            disabled={saving || !newDomain.domain.trim()}
            className="mb-4 px-4 py-2.5 rounded-lg border border-[var(--border)] font-semibold text-[var(--text)] disabled:opacity-50"
          >
            {t("Add domain")}
          </button>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {(settings?.domains || []).map((d) => (
            <div key={d._id} className="flex flex-wrap items-center gap-3 py-3">
              <code className="font-mono text-sm text-[var(--text)]" dir="ltr">
                @{d.domain}
              </code>
              <span className="text-sm text-[var(--text-muted)]">
                {isAr && d.universityAr ? d.universityAr : d.university || "—"}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">
                {d.faculty === "computer_science" ? t("Computer science") : d.faculty === "other" ? t("Other") : t("Engineering")}
              </span>
              <label className="flex items-center gap-2 text-sm ms-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.active}
                  onChange={(e) => updateDomain(d._id, { active: e.target.checked })}
                  className="w-4 h-4 accent-[var(--brand-primary)]"
                />
                {t("Accepting")}
              </label>
              <button
                onClick={() => removeDomain(d._id)}
                className="text-sm text-[var(--danger)] hover:underline"
              >
                {t("Remove")}
              </button>
            </div>
          ))}
          {!settings?.domains?.length && (
            <p className="text-sm text-[var(--text-muted)] py-3">
              {t("No domains yet — nobody can join until one is added.")}
            </p>
          )}
        </div>
      </Card>

      {/* ── Members ── */}
      <Card title={t("Members")} description={`${membersTotal} ${t("applications in total")}`}>
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
          <button
            onClick={async () => {
              if (await runMaintenance()) {
                toast.success(t("Renewals rolled and expiries applied."));
                fetchMembers({ page: filter.page });
                fetchStats();
              }
            }}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-semibold text-[var(--text)] disabled:opacity-50"
          >
            {t("Run renewals now")}
          </button>
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
                          onClick={() => onMemberAction(m._id, "verified")}
                          className="text-xs px-2.5 py-1.5 rounded border border-[var(--border)] hover:border-[var(--success)] text-[var(--text)]"
                        >
                          {t("Approve")}
                        </button>
                      )}
                      {m.status !== "suspended" && (
                        <button
                          onClick={() => onMemberAction(m._id, "suspended")}
                          className="text-xs px-2.5 py-1.5 rounded border border-[var(--border)] hover:border-[var(--danger)] text-[var(--text)]"
                        >
                          {t("Suspend")}
                        </button>
                      )}
                      {m.status === "pending" && (
                        <button
                          onClick={() => onMemberAction(m._id, "rejected")}
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

export default StudentProgramPage;
