import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useStudentStore, type ProgramSettings } from "../../../stores/student.store";
import { Card, Field, PageHead, btnPrimary, inputCls } from "./shared";

/**
 * What a verified student gets, and how often it comes back.
 *
 * The switch that opens the programme lives here rather than on the overview,
 * next to the terms it opens: turning it on is agreeing to these numbers, and
 * the two should not be a page apart.
 */

const StudentsOfferPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings, saving, fetchSettings, saveSettings } = useStudentStore();
  const [draft, setDraft] = useState<Partial<ProgramSettings>>({});

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const onSave = async () => {
    const done = await saveSettings({
      enabled: draft.enabled,
      discount: draft.discount,
      renewal: draft.renewal,
      membershipDays: draft.membershipDays,
    });
    if (done) toast.success(t("Programme settings saved."));
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <PageHead
        title={t("The offer")}
        description={t("What a verified student gets, and how often it comes back.")}
      >
        <button onClick={onSave} disabled={saving} className={btnPrimary}>
          {saving ? t("Saving…") : t("Save settings")}
        </button>
      </PageHead>

      <Card>
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

        <p className="text-sm text-[var(--text-muted)]">
          {t("The discount applies to the section's departments.")}{" "}
          <Link to="/dashboard/students/categories" className="text-[var(--brand-primary)] hover:underline">
            {t("Change what it covers")}
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default StudentsOfferPage;
