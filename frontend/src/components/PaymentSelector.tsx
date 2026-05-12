import React from "react";
import { useTranslation } from "react-i18next";

interface PaymentMethod {
  id: "cod" | "stripe" | "paymob";
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

interface PaymentSelectorProps {
  selected: string;
  onSelect: (method: string) => void;
}

const PaymentSelector: React.FC<PaymentSelectorProps> = ({
  selected,
  onSelect,
}) => {
  const { t } = useTranslation();

  const methods: PaymentMethod[] = [
    {
      id: "cod",
      label: t("Cash on Delivery"),
      description: t("Pay when you receive your order"),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "paymob",
      label: t("Online Payment (Egypt)"),
      description: t("Credit/Debit card, Fawry, Wallets"),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      badge: "Paymob",
    },
    {
      id: "stripe",
      label: t("International Payment"),
      description: t("Visa, Mastercard, Apple Pay, Google Pay"),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      badge: "Stripe",
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-[var(--text)] mb-2">
        {t("Payment Method")}
      </h3>
      {methods.map((method) => {
        const isSelected = selected === method.id;
        return (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              isSelected
                ? "border-[var(--brand-nav)] bg-[var(--brand-nav)]/5 shadow-sm"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
            }`}
          >
            {/* Radio indicator */}
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isSelected
                  ? "border-[var(--brand-nav)] bg-[var(--brand-nav)]"
                  : "border-[var(--border-strong)]"
              }`}
            >
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>

            {/* Icon */}
            <div
              className={`flex-shrink-0 ${
                isSelected ? "text-[var(--brand-nav)]" : "text-[var(--text-muted)]"
              }`}
            >
              {method.icon}
            </div>

            {/* Text */}
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${isSelected ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
                  {method.label}
                </span>
                {method.badge && (
                  <span className="text-[10px] font-bold uppercase bg-[var(--surface-2)] text-[var(--text-subtle)] px-1.5 py-0.5 rounded">
                    {method.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-subtle)] mt-0.5">{method.description}</p>
            </div>

            {/* Security badge */}
            {isSelected && method.id !== "cod" && (
              <div className="flex items-center gap-1 text-emerald-600 text-xs flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {t("Secure")}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PaymentSelector;
