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
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClosePopup}
      >
        <div
          className="relative bg-[var(--surface)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-[var(--border)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClosePopup}
            className="absolute top-3 right-3 bg-white/90 dark:bg-black/50 rounded-full p-2 shadow-lg hover:scale-110 z-10 transition-all"
          >
            <XMarkIcon className="h-5 w-5 text-[var(--text)]" />
          </button>
          <div onClick={handleClick} className="cursor-pointer">
            <img
              src={cldImg(currentAd.image, { w: 1200 })}
              alt={currentAd.title}
              className="w-full h-auto max-h-[85vh] object-contain"
              loading="eager"
              decoding="async"
            />
          </div>
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
