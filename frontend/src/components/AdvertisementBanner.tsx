import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdvertisementStore } from "../stores/advertisement.store";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cldImg, cldSrcSet } from "../lib/cldImage";

interface AdvertisementBannerProps {
  position?: "hero" | "banner" | "popup" | "category-strip" | "sidebar" | "pdp";
}

const AdvertisementBanner: React.FC<AdvertisementBannerProps> = ({
  position = "banner",
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const {
    activeAdvertisements,
    fetchActiveAdvertisements,
    incrementViewCount,
    incrementClickCount,
  } = useAdvertisementStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [viewTracked, setViewTracked] = useState<Set<string>>(new Set());
  const [popupClosed, setPopupClosed] = useState(false);

  useEffect(() => {
    fetchActiveAdvertisements();
  }, [fetchActiveAdvertisements]);

  const ads = activeAdvertisements.filter((ad) => ad.position === position);

  useEffect(() => {
    if (ads.length > 0) {
      const currentAd = ads[currentIndex];

      if (!viewTracked.has(currentAd._id)) {
        incrementViewCount(currentAd._id);
        setViewTracked((prev) => new Set(prev).add(currentAd._id));
      }

      if (position === "popup" && !showPopup && !popupClosed) {
        const popupClosedSession = sessionStorage.getItem("popupClosed");
        if (!popupClosedSession) {
          setShowPopup(true);
        }
      }

      if (ads.length > 1 && position !== "popup") {
        const interval = setInterval(() => {
          setCurrentIndex((prev) => (prev + 1) % ads.length);
        }, 6000);
        return () => clearInterval(interval);
      }
    }
  }, [ads, currentIndex, position, incrementViewCount, viewTracked, showPopup, popupClosed]);

  // Esc closes the popup + lock page scroll while it's open.
  // Declared before any early return to satisfy Rules of Hooks.
  useEffect(() => {
    if (!(position === "popup" && showPopup)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPopup(false);
        setPopupClosed(true);
        sessionStorage.setItem("popupClosed", "true");
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [position, showPopup]);

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex];

  const handleClick = () => {
    incrementClickCount(currentAd._id);
    if (currentAd.link) {
      if (currentAd.link.startsWith("/")) {
        window.location.href = currentAd.link;
      } else {
        window.open(currentAd.link, "_blank");
      }
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupClosed(true);
    sessionStorage.setItem("popupClosed", "true");
  };

  // Prefer titleAr / subtitleAr / descriptionAr when available and in AR mode.
  const title = (isRtl && currentAd.titleAr) || currentAd.title || "";
  const subtitle =
    (isRtl && (currentAd.subtitleAr || currentAd.descriptionAr)) ||
    currentAd.subtitle ||
    currentAd.description ||
    "";

  // Popup Advertisement
  if (position === "popup" && showPopup) {
    const description =
      (isRtl && currentAd.descriptionAr) || currentAd.description || "";
    const hasCopy = Boolean(title || subtitle || description);
    const ctaLabel = currentAd.link ? t("Shop Now") : t("Got it");
    const handleCta = () => {
      if (currentAd.link) handleClick();
      handleClosePopup();
    };

    return (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
        onClick={handleClosePopup}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-popup-title"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div
          className="relative bg-[var(--surface)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-[var(--border)] grid grid-cols-1 md:grid-cols-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClosePopup}
            aria-label={t("Close")}
            className={`absolute top-3 ${isRtl ? "left-3" : "right-3"} bg-white/95 dark:bg-black/60 rounded-full p-2 shadow-lg hover:scale-110 z-10 transition-all`}
          >
            <XMarkIcon className="h-5 w-5 text-[var(--text)]" />
          </button>

          {/* Image side */}
          <div
            onClick={currentAd.link ? handleCta : undefined}
            className={`relative bg-[var(--surface-2)] flex items-center justify-center ${
              currentAd.link ? "cursor-pointer" : ""
            } ${hasCopy ? "aspect-square md:aspect-auto md:min-h-[360px]" : "aspect-[4/3]"}`}
          >
            <img
              src={cldImg(currentAd.image, { w: 1000 })}
              srcSet={cldSrcSet(currentAd.image, 500)}
              sizes="(min-width: 768px) 384px, 100vw"
              alt={title || currentAd.title || t("Promotion")}
              className="absolute inset-0 w-full h-full object-contain p-4"
              loading="eager"
              decoding="async"
            />
          </div>

          {/* Content side */}
          <div className="flex flex-col p-6 md:p-8 gap-3 overflow-y-auto">
            <span className="inline-flex items-center gap-1.5 self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-[#FF6A1A] to-[#E8530A] text-white shadow-sm">
              ✨ {t("Limited Offer")}
            </span>

            <h2
              id="ad-popup-title"
              className="text-xl md:text-2xl font-extrabold text-[var(--text)] leading-tight"
            >
              {title || t("Special Promotion")}
            </h2>

            {subtitle && (
              <p className="text-sm md:text-base font-semibold text-[var(--brand-primary)] leading-snug">
                {subtitle}
              </p>
            )}

            {description && (
              <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-5">
                {description}
              </p>
            )}

            <div className="mt-auto pt-4 flex flex-col gap-2">
              <button
                onClick={handleCta}
                className="w-full inline-flex items-center justify-center gap-2 font-semibold rounded-xl bg-gradient-to-r from-[#FF6A1A] to-[#E8530A] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all px-6 py-3 text-sm md:text-base"
              >
                {ctaLabel}
                {currentAd.link && (
                  <svg
                    className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                )}
              </button>
              <button
                onClick={handleClosePopup}
                className="w-full text-xs text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors py-1"
              >
                {t("No thanks")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Popup ads that have already been dismissed (or haven't opened yet) must
  // not fall through to the image-banner render below — otherwise the popup
  // creative leaks into the page as a giant inline strip.
  if (position === "popup") return null;

  // ── Promo strip (no image, gradient background) ──
  if (position === "banner") {
    return (
      <div
        onClick={handleClick}
        dir={isRtl ? "rtl" : "ltr"}
        className={`relative w-full my-6 rounded-2xl overflow-hidden cursor-pointer group bg-gradient-to-r from-[#FF6A1A] to-[#E8530A] shadow-lg hover:shadow-xl transition-shadow`}
      >
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-6 md:px-10 py-6 md:py-7 ${
            isRtl ? "sm:flex-row-reverse" : ""
          }`}
        >
          <div className={`flex flex-col gap-1 ${isRtl ? "items-end text-right" : "items-start text-left"}`}>
            {title && (
              <h2 className="text-lg md:text-2xl font-extrabold text-white leading-tight drop-shadow">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-white/85 text-sm md:text-base">{subtitle}</p>
            )}
          </div>
          <span className="shrink-0 inline-flex items-center gap-2 font-semibold rounded-xl bg-white text-[#E8530A] shadow px-5 py-2.5 text-sm group-hover:scale-105 transition-transform whitespace-nowrap">
            {t("View Deals")}
            <svg
              className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${isRtl ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </div>
    );
  }

  const isHero = position === "hero";
  const isSidebar = position === "sidebar";
  const isStrip = position === "category-strip";

  // Aspect ratio per placement
  const aspectClass = isHero
    ? "aspect-[16/6] md:aspect-[16/5]"
    : isSidebar
      ? "aspect-[3/4]"
      : isStrip
        ? "aspect-[16/4] md:aspect-[16/3]"
        : "aspect-[16/5] md:aspect-[16/4]";

  // Only overlay marketing copy when the admin filled in a subtitle/description.
  // This lets pre-designed creatives (text baked into the image) render clean,
  // while plain images still get a headline + CTA.
  const showOverlay = Boolean(subtitle);
  const imgW = isHero ? 1600 : isSidebar ? 640 : 1280;
  const srcW = isHero ? 800 : isSidebar ? 320 : 640;

  // ── Image-based promotional banner (Amazon/Noon style) ──
  return (
    <div
      onClick={handleClick}
      className={`relative w-full cursor-pointer overflow-hidden rounded-2xl ${
        isHero ? "my-4" : isStrip ? "my-4" : "my-6"
      } group`}
    >
      <div className={`relative w-full ${aspectClass} bg-[var(--surface-2)]`}>
        <img
          src={cldImg(currentAd.image, { w: imgW })}
          srcSet={cldSrcSet(currentAd.image, srcW)}
          sizes={isSidebar ? "(min-width:1024px) 280px, 100vw" : "100vw"}
          alt={title || currentAd.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading={isHero ? "eager" : "lazy"}
          decoding="async"
        />

        {showOverlay && (
          <div
            className={`absolute inset-0 flex flex-col justify-center gap-2 p-6 md:p-10 ${
              isRtl
                ? "items-end text-right bg-gradient-to-l"
                : "items-start text-left bg-gradient-to-r"
            } from-black/70 via-black/30 to-transparent`}
          >
            {title && (
              <h2
                className={`font-extrabold text-white drop-shadow-lg leading-tight max-w-xl ${
                  isHero
                    ? "text-2xl md:text-4xl lg:text-5xl"
                    : "text-xl md:text-3xl"
                }`}
              >
                {title}
              </h2>
            )}
            <p
              className={`text-white/90 drop-shadow max-w-md ${
                isHero ? "text-sm md:text-lg" : "text-xs md:text-base"
              }`}
            >
              {subtitle}
            </p>
            <span
              className={`mt-2 inline-flex items-center gap-2 font-semibold rounded-xl bg-gradient-to-r from-[#FF6A1A] to-[#E8530A] text-white shadow-lg transition-transform group-hover:scale-105 ${
                isHero ? "px-6 py-3 text-sm" : "px-5 py-2.5 text-xs md:text-sm"
              }`}
            >
              {isHero ? t("Shop Now") : t("View Deals")}
              <svg
                className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${
                  isRtl ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </span>
          </div>
        )}
      </div>

      {/* Carousel indicators */}
      {ads.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {ads.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/40 w-1.5 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvertisementBanner;
