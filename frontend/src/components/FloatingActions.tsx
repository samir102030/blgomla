import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const WHATSAPP_NUMBER = "201009353639"; // Belgomla support, E.164 without "+"
const SCROLL_THRESHOLD = 320; // px — show the back-to-top button after this

/**
 * Fixed-position floating action buttons stacked at the bottom-left of the
 * viewport (anchored to screen-left in both LTR and RTL, by the user's
 * request). WhatsApp is always visible; Back-to-top fades in after the
 * user has scrolled past SCROLL_THRESHOLD.
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

  // Pre-filled message so the chat opens with context for the agent.
  const waMessage = encodeURIComponent(
    t("Hi! I have a question about a product on Belgomla.")
  );
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`;

  return (
    <>
      {/* LEFT anchor — WhatsApp, always visible */}
      <div className="fixed bottom-5 left-4 sm:bottom-6 sm:left-6 z-30">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("Chat with us on WhatsApp")}
          title={t("Chat with us on WhatsApp")}
          className="group relative inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/40 hover:scale-105 active:scale-95 transition-all"
        >
          {/* Subtle pulse ring — drawn behind the button so it doesn't block clicks. */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping pointer-events-none" aria-hidden="true" />
          <svg
            viewBox="0 0 32 32"
            fill="currentColor"
            className="relative w-6 h-6 sm:w-7 sm:h-7"
            aria-hidden="true"
          >
            <path d="M16.003 3C9.376 3 4 8.376 4 15.003c0 2.643.86 5.084 2.314 7.066L4.062 29l7.106-2.226A11.954 11.954 0 0 0 16.003 27C22.63 27 28 21.624 28 14.997 28 8.37 22.63 3 16.003 3zm6.946 17.16c-.296.832-1.745 1.594-2.428 1.69-.62.088-1.4.124-2.262-.142-.522-.165-1.193-.387-2.052-.756-3.612-1.559-5.97-5.185-6.15-5.425-.18-.24-1.471-1.955-1.471-3.73 0-1.774.931-2.647 1.262-3.01.331-.363.722-.454.962-.454.24 0 .482.002.692.012.222.011.519-.084.811.618.296.71 1.005 2.452 1.094 2.63.09.18.149.39.03.63-.12.24-.18.39-.36.6-.179.21-.378.469-.539.629-.18.18-.367.375-.158.733.21.359.93 1.535 1.998 2.486 1.371 1.223 2.527 1.602 2.886 1.781.359.18.567.15.778-.09.21-.24.898-1.048 1.137-1.408.24-.359.479-.299.808-.18.33.12 2.093.988 2.452 1.168.359.18.598.27.687.42.09.149.09.869-.207 1.7z" />
          </svg>
        </a>
      </div>

      {/* RIGHT anchor — Back-to-top, sits above the GeneralSupportChat widget. */}
      <button
        type="button"
        onClick={scrollTop}
        aria-label={t("Back to top")}
        title={t("Back to top")}
        className={`fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-30 inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all ${
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
