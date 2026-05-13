import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPrompt: React.FC = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 30 seconds of browsing
      setTimeout(() => setIsVisible(true), 30000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-slideUp">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-4 flex items-start gap-3">
        {/* App icon */}
        <div className="w-12 h-12 rounded-xl bg-[#002B5B] flex items-center justify-center flex-shrink-0">
          <img src="/logo.png" alt="Belgomla" className="w-8 h-8" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>

        <div className="flex-grow min-w-0">
          <h4 className="font-semibold text-[var(--text)] text-sm">
            {t("Install Belgomla")}
          </h4>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {t("Get quick access and offline support")}
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleInstall}
              className="px-4 py-1.5 bg-[var(--brand-nav)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              {t("Install")}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              {t("Not now")}
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleDismiss}
          className="text-[var(--text-subtle)] hover:text-[var(--text)] flex-shrink-0 mt-0.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
