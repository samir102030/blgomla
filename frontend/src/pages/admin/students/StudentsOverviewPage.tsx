import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useStudentStore } from "../../../stores/student.store";
import { Card, PageHead, btnGhost } from "./shared";
import ElectronicsPurgeCard from "../../../components/admin/ElectronicsPurgeCard";

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
      to: "/dashboard/electronics/products",
      action: t("Add a product"),
    },
    !activeDomains && {
      text: t("No faculty domains are accepting applications — nobody can join."),
      to: "/dashboard/electronics/faculties",
      action: t("Add a faculty"),
    },
    !open && {
      text: t("The programme is closed, so the page shows a notice instead of the form."),
      to: "/dashboard/electronics/offer",
      action: t("Open the programme"),
    },
  ].filter(Boolean) as Array<{ text: string; to: string; action: string }>;

  const figures: Array<[string, number | string | undefined, string?]> = [
    [t("Pending"), stats?.pending, "/dashboard/electronics/members"],
    [t("Verified"), stats?.verified, "/dashboard/electronics/members"],
    [t("Suspended"), stats?.suspended, "/dashboard/electronics/members"],
    [t("Expired"), stats?.expired, "/dashboard/electronics/members"],
    [t("Codes issued"), stats?.codesIssued],
    [t("Redemptions"), stats?.redemptions],
  ];

  const shelf: Array<[string, number | string, string]> = [
    [t("Products"), catalogTotal, "/dashboard/electronics/products"],
    [t("Departments"), departments, "/dashboard/electronics/categories"],
    [t("Accepting faculties"), activeDomains, "/dashboard/electronics/faculties"],
  ];

  return (
    <div className="space-y-6">
      <PageHead
        title={t("Electronics section")}
        description={t(
          "A shop inside the shop: its own departments, its own products, and a student discount that is good here and nowhere else.",
        )}
      >
        <span
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
            open
              ? "bg-green-50 text-green-600"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {open ? t("Open to applications") : t("Closed")}
        </span>
      </PageHead>

      {blockers.map((b) => (
        <div
          key={b.to}
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3"
        >
          <span className="text-sm text-gray-900 flex-1">{b.text}</span>
          <Link to={b.to} className="text-sm font-semibold text-[var(--brand-primary)] hover:underline">
            {b.action}
          </Link>
        </div>
      ))}

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {figures.map(([label, value, to]) => {
          const cell = (
            <div className="rounded-xl border border-gray-200 bg-white p-4 h-full">
              <div className="text-2xl font-bold text-gray-900 font-mono">{value ?? "—"}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
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
              className="rounded-lg border border-gray-200 p-4 hover:border-[var(--brand-primary)] transition-colors"
            >
              <div className="text-xl font-bold text-gray-900 font-mono">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
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
          <a href="/electronics" target="_blank" rel="noreferrer" className={btnGhost}>
            {t("View the section on the storefront")}
          </a>
        </div>
      </Card>

      {/* Last on the page on purpose: it is the one control here that cannot be
          undone, and it belongs after everything somebody came to read. */}
      <ElectronicsPurgeCard />
    </div>
  );
};

export default StudentsOverviewPage;
