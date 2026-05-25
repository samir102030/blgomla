import React, { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";
import { useUserStore } from "../stores/user.store";

interface StockAlertProps {
  productId: string;
  inStock: boolean;
}

// Demand capture: notify-when-back-in-stock (OOS) or notify-on-price-drop (in stock).
const StockAlert: React.FC<StockAlertProps> = ({ productId, inStock }) => {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const type = inStock ? "price_drop" : "restock";

  const submit = async () => {
    if (!email.trim()) {
      toast.error(t("inventory.stockAlert.enterEmail"));
      return;
    }
    setSubmitting(true);
    try {
      await axiosInstance.post(`/products/${productId}/notify`, {
        email: email.trim(),
        type,
      });
      setDone(true);
      toast.success(t("inventory.stockAlert.done"));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("inventory.stockAlert.subscribeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-emerald-600 mt-3">
        ✅ {t("inventory.stockAlert.emailWhenAvailable")}
      </p>
    );
  }

  const label = inStock
    ? t("inventory.stockAlert.notifyPriceDrop")
    : t("inventory.stockAlert.notifyRestock");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-medium text-[var(--brand-primary)] hover:underline"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="mt-3 flex flex-col sm:flex-row gap-2 max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("inventory.stockAlert.yourEmail")}
        className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
      />
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="rounded-lg bg-[var(--brand-primary)] text-white text-sm font-semibold px-4 py-2 hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 whitespace-nowrap"
      >
        {submitting ? t("inventory.stockAlert.saving") : t("inventory.stockAlert.notifyMe")}
      </button>
    </div>
  );
};

export default StockAlert;
