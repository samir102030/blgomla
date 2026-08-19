import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../lib/axios";

const STORAGE_KEY = "exitIntentShown";
const COOLDOWN_DAYS = 7;
const DISCOUNT_CODE = "WELCOME10";
const SKIP_PATHS = ["/dashboard", "/vendor", "/checkout", "/login"];

const recentlyShown = () => {
  const ts = Number(localStorage.getItem(STORAGE_KEY) || 0);
  return ts > 0 && Date.now() - ts < COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
};

const ExitIntentPopup: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (SKIP_PATHS.some((p) => path.startsWith(p))) return;
    if (recentlyShown()) return;

    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !recentlyShown()) {
        setOpen(true);
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        document.removeEventListener("mouseout", onLeave);
      }
    };
    // Arm after a short delay so it doesn't fire on initial load.
    const arm = setTimeout(
      () => document.addEventListener("mouseout", onLeave),
      8000
    );
    return () => {
      clearTimeout(arm);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await axiosInstance.post("/subscribers", { email, source: "exit-intent" });
    } catch {
      // Non-blocking — reveal the code regardless.
    }
    setRevealed(true);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(DISCOUNT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 ltr:right-3 rtl:left-3 p-1.5 rounded-full hover:bg-[var(--surface-2)] z-10"
        >
          <XMarkIcon className="h-5 w-5 text-[var(--text-muted)]" />
        </button>

        <div className="bg-gradient-to-br from-[#00A8E8] to-[#0077B6] p-6 text-center text-white">
          <div className="text-4xl mb-2">🎁</div>
          <h2 className="text-2xl font-extrabold">{t("Wait! Don't go yet")}</h2>
          <p className="text-white/90 text-sm mt-1">
            {t("Get 10% off your first order")}
          </p>
        </div>

        <div className="p-6">
          {!revealed ? (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-sm text-[var(--text-muted)] text-center">
                {t("Enter your email and we'll send your discount code instantly.")}
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("Enter your email")}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] text-sm"
              />
              <button
                type="submit"
                className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[#00A8E8] to-[#0077B6] text-white font-semibold text-sm hover:shadow-lg transition-all active:scale-[0.98]"
              >
                {t("Get my code")}
              </button>
              <p className="text-[11px] text-[var(--text-subtle)] text-center">
                {t("No spam. Unsubscribe anytime.")}
              </p>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-[var(--text)]">
                {t("Here's your code — use it at checkout:")}
              </p>
              <button
                onClick={copyCode}
                className="w-full px-5 py-3 rounded-xl border-2 border-dashed border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)] font-bold text-lg tracking-widest hover:bg-[var(--brand-primary)]/10 transition-colors"
              >
                {DISCOUNT_CODE}
              </button>
              <p className="text-xs text-[var(--text-muted)]">
                {copied ? t("Copied!") : t("Tap the code to copy")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
