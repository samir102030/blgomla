import React from "react";
import { useTranslation } from "react-i18next";
import type { StudentStatus } from "../../../stores/student.store";

/**
 * The pieces every page of the student module uses.
 *
 * They deliberately look like the rest of the dashboard — white cards on grey,
 * the yellow primary button, the same table chrome — rather than carrying the
 * storefront section's own identity inland. The student area is its own
 * product to a student; to an operator it is one more thing to run, and a
 * screen that looks unlike every other screen is one more thing to learn.
 */

export const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent";

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <label className="block mb-4">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
  </label>
);

export const Card: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <section className="bg-white p-6 rounded-lg shadow-sm border">
    {title && <h2 className="text-lg font-semibold text-[#333333]">{title}</h2>}
    {description && <p className="text-sm text-gray-500 mt-0.5 mb-4">{description}</p>}
    {children}
  </section>
);

/** The page title block, so every page in the module opens the same way. */
export const PageHead: React.FC<{
  title: string;
  description?: string;
  children?: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">{title}</h1>
      {description && <p className="text-[#9E9E9E] max-w-2xl">{description}</p>}
    </div>
    {children && <div className="flex gap-2 w-full sm:w-auto">{children}</div>}
  </div>
);

/** A figure card, the same one the catalogue pages use. */
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  tone?: string;
  icon?: string;
}> = ({ label, value, tone = "text-gray-900", icon = "•" }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border h-full">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      </div>
      <div className="bg-gray-100 p-3 rounded-full">
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  </div>
);

export const STATUS_TONE: Record<StudentStatus, string> = {
  verified: "bg-[#009688]/10 text-[#009688]",
  pending: "bg-[#FFD600]/20 text-[#8a6d00]",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-red-100 text-red-700",
  expired: "bg-[#9E9E9E]/10 text-[#9E9E9E]",
};

export const btnPrimary =
  "bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50";
export const btnGhost =
  "px-4 py-2 rounded-lg border border-gray-300 text-[#333333] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50";

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
