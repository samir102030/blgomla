import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useStudentStore } from "../../../stores/student.store";
import { Card, PageHead, btnGhost } from "./shared";

/**
 * Where the module opens: the state of the programme in one screen, and a
 * route to whichever part of it needs attention.
 *
 * It answers the three questions an operator actually arrives with — is it
 * running, is anybody waiting on me, and is it set up enough to run at all —
 * before offering anything to configure.
 */

const StudentsOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    settings,
    stats,
    saving,
    catalogCategories,
    catalogTotal,
    fetchSettings,
    fetchStats,
    fetchCatalogCategories,
    fetchCatalogProducts,
    runMaintenance,
    saveSettings,
  } = useStudentStore();

  useEffect(() => {
    fetchSettings();
    fetchStats();
    fetchCatalogCategories();
    fetchCatalogProducts({ limit: 1 });
  }, [fetchSettings, fetchStats, fetchCatalogCategories, fetchCatalogProducts]);

  const open = !!settings?.enabled;
  const activeDomains = (settings?.domains || []).filter((d) => d.active).length;
  const departments = catalogCategories.length;

  /* What stops the programme working, in the order it stops working. */
  const blockers = [
    !catalogTotal && {
      text: t("The section has nothing to sell yet."),
      to: "/dashboard/students/products",
      action: t("Add a product"),
    },
    !activeDomains && {
      text: t("No faculty domains are accepting applications — nobody can join."),
      to: "/dashboard/students/faculties",
      action: t("Add a faculty"),
    },
    !open && {
      text: t("The programme is closed, so the page shows a notice instead of the form."),
      to: "/dashboard/students/offer",
      action: t("Open the programme"),
    },
  ].filter(Boolean) as Array<{ text: string; to: string; action: string }>;

  const figures: Array<[string, number | string | undefined, string?]> = [
    [t("Pending"), stats?.pending, "/dashboard/students/members"],
    [t("Verified"), stats?.verified, "/dashboard/students/members"],
    [t("Suspended"), stats?.suspended, "/dashboard/students/members"],
    [t("Expired"), stats?.expired, "/dashboard/students/members"],
    [t("Codes issued"), stats?.codesIssued],
    [t("Redemptions"), stats?.redemptions],
  ];

  const shelf: Array<[string, number | string, string]> = [
    [t("Products"), catalogTotal, "/dashboard/students/products"],
    [t("Departments"), departments, "/dashboard/students/categories"],
    [t("Accepting faculties"), activeDomains, "/dashboard/students/faculties"],
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <PageHead
        title={t("Student programme")}
        description={t(
          "A shop inside the shop: its own departments, its own products, open to students who prove enrolment with a faculty email.",
        )}
      >
        <span
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
            open
              ? "bg-[var(--success-bg)] text-[var(--success)]"
              : "bg-[var(--surface-2)] text-[var(--text-muted)]"
          }`}
        >
          {open ? t("Open to applications") : t("Closed")}
        </span>
      </PageHead>

      {blockers.map((b) => (
        <div
          key={b.to}
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-bg)] px-4 py-3"
        >
          <span className="text-sm text-[var(--text)] flex-1">{b.text}</span>
          <Link to={b.to} className="text-sm font-semibold text-[var(--brand-primary)] hover:underline">
            {b.action}
          </Link>
        </div>
      ))}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {figures.map(([label, value, to]) => {
          const cell = (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 h-full">
              <div className="text-2xl font-bold text-[var(--text)] font-mono">{value ?? "—"}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
            </div>
          );
          return to ? (
            <Link key={label} to={to} className="block hover:opacity-80 transition-opacity">
              {cell}
            </Link>
          ) : (
            <div key={label}>{cell}</div>
          );
        })}
      </div>

      <Card
        title={t("What the section sells")}
        description={t("Its own products, filed in its own departments. Nothing here appears on the main shop.")}
      >
        <div className="grid sm:grid-cols-3 gap-3">
          {shelf.map(([label, value, to]) => (
            <Link
              key={label}
              to={to}
              className="rounded-lg border border-[var(--border)] p-4 hover:border-[var(--brand-primary)] transition-colors"
            >
              <div className="text-xl font-bold text-[var(--text)] font-mono">{value}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
            </Link>
          ))}
        </div>
      </Card>

      <Card
        title={t("Maintenance")}
        description={t(
          "Renewals and expiries run nightly on their own. This is the same sweep, on demand.",
        )}
      >
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              if (await runMaintenance()) {
                toast.success(t("Renewals rolled and expiries applied."));
                fetchStats();
              }
            }}
            disabled={saving}
            className={btnGhost}
          >
            {t("Run renewals now")}
          </button>
          <button
            onClick={async () => {
              if (await saveSettings({ enabled: !open })) {
                toast.success(open ? t("Programme closed.") : t("Programme opened."));
              }
            }}
            disabled={saving}
            className={btnGhost}
          >
            {open ? t("Close the programme") : t("Open the programme")}
          </button>
          <a href="/students" target="_blank" rel="noreferrer" className={btnGhost}>
            {t("View the student page")}
          </a>
        </div>
      </Card>
    </div>
  );
};

export default StudentsOverviewPage;
