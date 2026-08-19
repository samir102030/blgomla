import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useStudentStore } from "../../../stores/student.store";
import { useCategoryStore } from "../../../stores/category.store";
import { Card, PageHead, btnPrimary, idsOf, useLocalName } from "./shared";

/**
 * The departments of the student shop.
 *
 * The same list does two jobs, deliberately: it decides what the student area
 * shows, and it decides what a student code will pay for. Splitting them into
 * two settings would let the section display something the discount refuses,
 * which is the one failure a student would take personally.
 *
 * Departments are picked at root level. Everything filed beneath one comes
 * with it — the server expands the subtree when it mints a code, because the
 * coupon matcher compares category ids exactly and every product lives in a
 * leaf.
 */

const StudentsCategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  const localName = useLocalName();
  const { settings, saving, fetchSettings, saveSettings } = useStudentStore();
  const categories = useCategoryStore((s) => s.categories);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);

  const [chosen, setChosen] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (!categories.length) fetchCategories();
  }, [fetchSettings, fetchCategories, categories.length]);

  useEffect(() => {
    if (settings && !dirty) setChosen(idsOf(settings.categories));
  }, [settings, dirty]);

  const roots = useMemo(
    () => (categories || []).filter((c: any) => !c.parentCategory),
    [categories],
  );

  const chosenSet = useMemo(() => new Set(chosen), [chosen]);

  const toggle = (id: string) => {
    setDirty(true);
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onSave = async () => {
    if (await saveSettings({ categories: chosen as any })) {
      setDirty(false);
      toast.success(t("Departments saved."));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <PageHead
        title={t("Departments")}
        description={t(
          "Which parts of the catalogue the student section covers. Every subcategory beneath a chosen department is included automatically, and the student discount applies to exactly the same list.",
        )}
      >
        <button onClick={onSave} disabled={saving || !dirty} className={btnPrimary}>
          {saving ? t("Saving…") : t("Save departments")}
        </button>
      </PageHead>

      <Card>
        {!roots.length && (
          <p className="text-sm text-[var(--text-muted)]">{t("Categories are still loading.")}</p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {roots.map((c: any) => {
            const on = chosenSet.has(String(c._id));
            return (
              <button
                key={c._id}
                type="button"
                onClick={() => toggle(String(c._id))}
                aria-pressed={on}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-start transition-colors ${
                  on
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10"
                    : "border-[var(--border)] hover:border-[var(--text-muted)]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border flex-shrink-0 ${
                    on
                      ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]"
                      : "border-[var(--border)]"
                  }`}
                />
                <span
                  className={`text-sm ${on ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]"}`}
                >
                  {localName(c)}
                </span>
              </button>
            );
          })}
        </div>

        {!chosen.length && !!roots.length && (
          <p className="text-sm text-[var(--text-muted)] mt-5">
            {t(
              "Nothing selected means the whole catalogue — every product is in the section and the discount applies everywhere.",
            )}
          </p>
        )}
      </Card>
    </div>
  );
};

export default StudentsCategoriesPage;
