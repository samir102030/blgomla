import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const SCROLL_THRESHOLD = 320; // px — show the back-to-top button after this

/**
 * Back to the top of the page, once there is a page to go back up.
 *
 * A WhatsApp button used to sit here too, always visible, as the shop's front
 * door for questions. It has moved into the support assistant, which answers
 * the question itself and opens WhatsApp — with the conversation attached —
 * only when it cannot. A visitor who wants a person still reaches one; they
 * just no longer have to start there.
 *
 * Sits above the page but below modals (z-30), so toasts / popups still
 * cover it.
 */
const FloatingActions: React.FC = () => {
  const { t } = useTranslation();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > SCROLL_THRESHOLD);
    onScroll(); // initial state on route change
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Sits above the support assistant's bubble, which holds the corner. */}
      <button
        type="button"
        onClick={scrollTop}
        aria-label={t("Back to top")}
        title={t("Back to top")}
        style={{ bottom: "calc(5rem + var(--mobile-nav-h))" }}
        className={`fixed right-4 sm:right-6 z-30 inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all ${
          showTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </>
  );
};

export default FloatingActions;
