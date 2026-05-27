import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Admin language toggle — compact circular button that matches the rest of
 * the dashboard icon cluster (theme, notifications). Shows the language code
 * the button will switch TO, mirroring the storefront convention so users
 * always know what tapping the button will do.
 */
const AdminLanguageToggle: React.FC = () => {
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === "ar";

  const toggleLanguage = () => {
    const newLang = isAr ? "en" : "ar";
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };

  // Show the language the user will SWITCH TO, so the tap is self-explanatory.
  const targetLabel = isAr ? "EN" : "ع";
  const titleLabel = isAr ? t("admin.english") : t("admin.arabic");

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={titleLabel}
      title={titleLabel}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
    >
      <span className="text-sm font-semibold leading-none">{targetLabel}</span>
    </button>
  );
};

export default AdminLanguageToggle;
