import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";
import type { Coupon } from "../types/coupon.type";

const CouponStrip: React.FC<{ title?: string }> = ({ title }) => {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    axiosInstance
      .get("/coupons/public")
      .then(({ data }) => setCoupons(data.coupons || []))
      .catch(() => {});
  }, []);

  if (coupons.length === 0) return null;

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const discountLabel = (c: Coupon) =>
    c.discountType === "percentage"
      ? `${c.discountValue}% ${t("OFF")}`
      : `${c.discountValue} ${t("EGP")} ${t("OFF")}`;

  return (
    <section className="shell py-6">
      <h2 className="text-lg sm:text-xl font-bold text-[var(--text)] mb-3 flex items-center gap-2">
 <span aria-hidden="true"></span>
        {title || t("Collect Coupons")}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {coupons.map((c) => (
          <div
            key={c._id}
            className="snap-start shrink-0 w-64 rounded-xl border border-dashed border-[var(--brand-primary)]/50 bg-[var(--brand-primary)]/5 p-4 flex flex-col gap-1"
          >
            <div className="text-xl font-extrabold text-[var(--brand-primary)]">
              {discountLabel(c)}
            </div>
            {c.description && (
              <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                {c.description}
              </p>
            )}
            {c.minimumPurchase ? (
              <p className="text-[11px] text-[var(--text-subtle)]">
                {t("Min. spend")}{" "}
                {c.minimumPurchase.toLocaleString("en-EG")} {t("EGP")}
              </p>
            ) : null}
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold tracking-wider text-[var(--text)] bg-[var(--surface-2)] rounded px-2 py-1">
                {c.code}
              </span>
              <button
                onClick={() => copy(c.code)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00A8E8] to-[#0077B6] text-white hover:shadow-md transition-all active:scale-95"
              >
                {copied === c.code ? t("Copied!") : t("Collect")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CouponStrip;
