import React from "react";
import { useTranslation } from "react-i18next";

// Belgomla brand tokens — kept here so the mark renders identically across
// light/dark surfaces without depending on CSS variables.
export const BRAND = {
  accent: "#00A8E8",
  accentDeep: "#0077B6",
  ink: "#0B0B10",
  white: "#FFFFFF",
} as const;

interface LogoProps {
  className?: string;
  size?: number;
  color?: string;
  showHandle?: boolean;
}

// MarkBag — the primary Belgomla mark. A geometric "B" letterform with a
// shopping-bag handle arc above. Sourced from the Belgomla logo system
// (Mark A · Bag-handle B). Renders on a 160×180 canvas.
const Logo: React.FC<LogoProps> = ({
  className = "",
  size = 40,
  color = BRAND.accent,
  showHandle = true,
}) => {
  const { t } = useTranslation();
  return (
    <svg
      width={size}
      height={(size * 180) / 160}
      viewBox="0 0 160 180"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={t("brand.wordmark", "Belgomla")}
      role="img"
    >
      {showHandle && (
        <path
          d="M54 22 Q54 0 80 0 Q106 0 106 22"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
      )}
      <path
        fillRule="evenodd"
        d="M22 22 L84 22 C108 22 122 38 122 58 C122 72 114 82 102 86 C118 90 130 102 130 120 C130 142 112 160 86 160 L22 160 Z M46 44 L46 76 L82 76 C92 76 98 68 98 60 C98 50 92 44 82 44 Z M46 100 L46 138 L84 138 C96 138 104 130 104 120 C104 110 96 100 84 100 Z"
        fill={color}
      />
    </svg>
  );
};

export default Logo;
