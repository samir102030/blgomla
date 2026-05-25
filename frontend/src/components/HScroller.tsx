import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface HScrollerProps {
  children: React.ReactNode;
  /** Gap utility classes for the track (default matches the product rails). */
  gapClass?: string;
}

/**
 * Horizontal snap-scroll rail with hidden scrollbar and RTL-aware prev/next
 * arrows (desktop). Children should be fixed-width `shrink-0 snap-start` items.
 */
const HScroller: React.FC<HScrollerProps> = ({ children, gapClass = "gap-3 sm:gap-4" }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 1) {
      setCanLeft(false);
      setCanRight(false);
      return;
    }
    const rtl = getComputedStyle(el).direction === "rtl";
    const fromLeft = rtl ? max + el.scrollLeft : el.scrollLeft;
    setCanLeft(fromLeft > 1);
    setCanRight(fromLeft < max - 1);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows, children]);

  // dir = -1 reveals content to the visual left, +1 to the visual right (LTR & RTL).
  const scrollByDir = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrowCls =
    "hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-[var(--surface)]/95 backdrop-blur border border-[var(--border)] text-[var(--text)] shadow-lg transition-all hover:bg-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:text-white hover:scale-105 active:scale-95";

  return (
    <div className="relative">
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          aria-label={t("common.scrollLeft", "Scroll left")}
          className={`${arrowCls} left-0`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
      )}

      <div
        ref={ref}
        onScroll={updateArrows}
        className={`flex ${gapClass} scroll-x-hidden scroll-smooth snap-x snap-proximity pt-2 pb-4 px-2 -mx-2`}
      >
        {children}
      </div>

      {canRight && (
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          aria-label={t("common.scrollRight", "Scroll right")}
          className={`${arrowCls} right-0`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      )}
    </div>
  );
};

export default HScroller;
