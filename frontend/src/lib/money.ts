import { useTranslation } from "react-i18next";

/**
 * Formats an amount as EGP — the only currency the store sells in.
 *
 * Digits stay Western ("en-EG") in both languages so figures line up in
 * tables; only the currency token is translated (EGP / ج.م.). Anything
 * rendering a price with a hardcoded "$" is a bug — use this instead.
 */
export const formatEGP = (amount: number | null | undefined, currency: string) =>
  `${Number(amount || 0).toLocaleString("en-EG", {
    maximumFractionDigits: 2,
  })} ${currency}`;

/** Hook form — resolves the currency token from the active language. */
export const useMoney = () => {
  const { t } = useTranslation();
  return (amount?: number | null) => formatEGP(amount, t("EGP"));
};
