import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useStudentStore, type Faculty } from "../../../stores/student.store";
import { Card, Field, PageHead, btnPrimary, inputCls, useLocalName } from "./shared";

/**
 * Who is allowed in.
 *
 * A faculty mail domain is the whole proof of enrolment, which is why this is
 * its own page and not a strip at the bottom of another one: adding a domain
 * admits everybody who holds an address on it, permanently, and that deserves
 * to be a deliberate visit.
 */

const StudentsFacultiesPage: React.FC = () => {
  const { t } = useTranslation();
  const localUniversity = useLocalName();
  const { settings, saving, fetchSettings, addDomain, updateDomain, removeDomain } =
    useStudentStore();

  const [draft, setDraft] = useState({
    domain: "",
    university: "",
    universityAr: "",
    faculty: "engineering" as Faculty,
  });

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onAdd = async () => {
    if (!draft.domain.trim()) return;
    if (await addDomain(draft)) {
      toast.success(t("Domain added."));
      setDraft({ domain: "", university: "", universityAr: "", faculty: "engineering" });
    }
  };

  const facultyLabel = (f: Faculty) =>
    f === "computer_science" ? t("Computer science") : f === "other" ? t("Other") : t("Engineering");

  const domains = settings?.domains || [];

  return (
    <div className="space-y-6">
      <PageHead
        title={t("Approved faculty domains")}
        description={t(
          "A faculty domain is the whole proof of enrolment. A university-wide domain would admit every faculty, so add the faculty address, not the university one.",
        )}
      />

      <Card
        title={t("Add a faculty")}
        description={t("Add as many as you like — one row per faculty domain.")}
      >
        <form
          className="grid sm:grid-cols-2 lg:grid-cols-5 gap-x-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd();
          }}
        >
          {/* The domain is the only required field, and it is the one that was
              being left empty while the button sat dead with nothing saying
              why. Marked, and Enter submits, so the form answers either way. */}
          <Field label={`${t("Domain")} *`}>
            <input
              className={inputCls}
              dir="ltr"
              required
              placeholder="eng.cu.edu.eg"
              value={draft.domain}
              onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
            />
          </Field>
          <Field label={t("University (English)")}>
            <input
              className={inputCls}
              value={draft.university}
              onChange={(e) => setDraft({ ...draft, university: e.target.value })}
            />
          </Field>
          <Field label={t("University (Arabic)")}>
            <input
              className={inputCls}
              value={draft.universityAr}
              onChange={(e) => setDraft({ ...draft, universityAr: e.target.value })}
            />
          </Field>
          <Field label={t("Faculty")}>
            <select
              className={inputCls}
              value={draft.faculty}
              onChange={(e) => setDraft({ ...draft, faculty: e.target.value as Faculty })}
            >
              <option value="engineering">{t("Engineering")}</option>
              <option value="computer_science">{t("Computer science")}</option>
              <option value="other">{t("Other")}</option>
            </select>
          </Field>
          {/* The primary style, not the ghost one: greyed out and outlined, it
              read as a fourth disabled text field rather than the button that
              finishes the form. */}
          <button
            type="submit"
            disabled={saving || !draft.domain.trim()}
            className={`${btnPrimary} mb-4`}
          >
            {saving ? t("Saving…") : t("Add domain")}
          </button>
        </form>
      </Card>

      <Card title={`${t("Accepting")} · ${domains.filter((d) => d.active).length} / ${domains.length}`}>
        <div className="divide-y divide-gray-200">
          {domains.map((d) => (
            <div key={d._id} className="flex flex-wrap items-center gap-3 py-3">
              <code className="font-mono text-sm text-gray-900" dir="ltr">
                @{d.domain}
              </code>
              <span className="text-sm text-gray-500">
                {localUniversity({ name: d.university, nameAr: d.universityAr })}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">
                {facultyLabel(d.faculty)}
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
                className="text-sm text-red-600 hover:underline"
              >
                {t("Remove")}
              </button>
            </div>
          ))}
          {!domains.length && (
            <p className="text-sm text-gray-500 py-3">
              {t("No domains yet — nobody can join until one is added.")}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StudentsFacultiesPage;
