import React from "react";
import { useTranslation } from "react-i18next";
import type { StudentStatus } from "../../../stores/student.store";

/**
 * The pieces every page of the student module uses.
 *
 * The module is a shop inside the shop — its own departments, its own shelf,
 * its own members — so it gets its own pages rather than one long screen, and
 * these are what keep those pages looking like one thing.
 */

export const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]";

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
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

export const Card: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 mb-5">
    {title && <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>}
    {description && <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">{description}</p>}
    {children}
  </section>
);

/** The page title block, so every page in the module opens the same way. */
export const PageHead: React.FC<{ title: string; description?: string; children?: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-[var(--text)]">{title}</h1>
      {description && <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl">{description}</p>}
    </div>
    {children}
  </header>
);

export const STATUS_TONE: Record<StudentStatus, string> = {
  verified: "bg-[var(--success-bg)] text-[var(--success)]",
  pending: "bg-[var(--warning-bg)] text-[var(--warning)]",
  rejected: "bg-[var(--danger-bg)] text-[var(--danger)]",
  suspended: "bg-[var(--danger-bg)] text-[var(--danger)]",
  expired: "bg-[var(--surface-2)] text-[var(--text-muted)]",
};

export const btnPrimary =
  "px-5 py-2.5 rounded-lg bg-[var(--brand-primary)] text-white font-semibold disabled:opacity-50";
export const btnGhost =
  "px-4 py-2.5 rounded-lg border border-[var(--border)] font-semibold text-[var(--text)] disabled:opacity-50";

/** Whichever name the reader can actually read. */
export const useLocalName = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (item?: { name?: string; nameAr?: string } | null) =>
    (isAr && item?.nameAr ? item.nameAr : item?.name) || "—";
};

/** First usable image on a product, whatever shape the record stores. */
export const firstImage = (images?: Array<{ url?: string } | string>) => {
  const first = images?.[0];
  if (!first) return null;
  return typeof first === "string" ? first : first.url || null;
};

/** Ids out of a list that may hold either populated documents or raw ids. */
export const idsOf = (list?: Array<{ _id: string } | string>) =>
  (list || []).map((entry: any) => String(entry?._id || entry));
