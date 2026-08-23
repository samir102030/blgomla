import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { getTheme, toggleTheme } from "../lib/theme";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  showLabel = true,
}) => {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "theme") {
        setTheme(getTheme());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleToggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
      title={isDark ? t("Switch to light mode") : t("Switch to dark mode")}
      className={
        showLabel
          ? `inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors ${className}`
          : `inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors ${className}`
      }
    >
      {isDark ? (
        <SunIcon className={showLabel ? "h-4 w-4" : "h-5 w-5"} />
      ) : (
        <MoonIcon className={showLabel ? "h-4 w-4" : "h-5 w-5"} />
      )}
      {showLabel && (
        <span className="text-xs sm:text-sm font-medium">
          {isDark ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
