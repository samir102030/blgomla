import React, { useEffect, useState } from "react";
import { useAdvertisementStore } from "../stores/advertisement.store";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface AdvertisementBannerProps {
  position?: "hero" | "banner" | "popup";
}

const AdvertisementBanner: React.FC<AdvertisementBannerProps> = ({
  position = "banner",
}) => {
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
              src={currentAd.image}
              alt={currentAd.title}
              className="w-full h-auto max-h-[85vh] object-contain"
              loading="eager"
            />
          </div>
        </div>
      </div>
    );
  }

  // Determine ad theme based on title keywords
  const isHero = position === "hero";
  const title = currentAd.title || "";
  const subtitle = currentAd.subtitle || currentAd.description || "";

  // ── Premium CSS-based promotional banner ──
  return (
    <div
      onClick={handleClick}
      className={`relative w-full cursor-pointer overflow-hidden rounded-2xl ${
        isHero ? "my-4" : "my-6"
      } group`}
    >
      {/* Gradient Background */}
      <div
        className={`relative ${
          isHero ? "py-12 md:py-16 lg:py-20" : "py-8 md:py-12"
        }`}
        style={{
          background: isHero
            ? "linear-gradient(135deg, #0B0B10 0%, #15151C 50%, #0B0B10 100%)"
            : "linear-gradient(135deg, #15151C 0%, #1c1c25 50%, #15151C 100%)",
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Glow orbs */}
          <div
            className="absolute w-64 h-64 rounded-full opacity-20 blur-3xl"
            style={{
              background: isHero
                ? "radial-gradient(circle, #FF6A1A, transparent)"
                : "radial-gradient(circle, #E8530A, transparent)",
              top: "-30%",
              right: "10%",
              animation: "float 6s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-48 h-48 rounded-full opacity-15 blur-3xl"
            style={{
              background: isHero
                ? "radial-gradient(circle, #FFB382, transparent)"
                : "radial-gradient(circle, #FF6A1A, transparent)",
              bottom: "-20%",
              left: "15%",
              animation: "float 8s ease-in-out infinite reverse",
            }}
          />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Diagonal accent line */}
          <div
            className="absolute top-0 right-0 w-1/3 h-full opacity-10"
            style={{
              background: `linear-gradient(135deg, transparent 30%, ${
                isHero ? "#FF6A1A" : "#E8530A"
              } 50%, transparent 70%)`,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 md:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Text content */}
            <div className="flex-1 text-center md:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                  {isHero ? "🔥 Limited Time Offer" : "💼 Wholesale Pricing"}
                </span>
              </div>

              {/* Title */}
              <h2
                className={`font-extrabold text-white mb-3 leading-tight ${
                  isHero
                    ? "text-3xl md:text-4xl lg:text-5xl"
                    : "text-2xl md:text-3xl lg:text-4xl"
                }`}
              >
                {title.split(" ").map((word, i) => {
                  // Color certain keywords
                  const highlights = ["Sale", "Discount", "Off", "Free", "خصم", "تخفيضات"];
                  const isHighlight = highlights.some((h) =>
                    word.toLowerCase().includes(h.toLowerCase())
                  );
                  return (
                    <span key={i}>
                      {isHighlight ? (
                        <span
                          className="bg-clip-text text-transparent"
                          style={{
                            backgroundImage: isHero
                              ? "linear-gradient(135deg, #FF6A1A, #FFB382)"
                              : "linear-gradient(135deg, #E8530A, #FF6A1A)",
                          }}
                        >
                          {word}
                        </span>
                      ) : (
                        word
                      )}{" "}
                    </span>
                  );
                })}
              </h2>

              {/* Subtitle */}
              {subtitle && (
                <p
                  className={`text-white/70 max-w-lg mb-6 ${
                    isHero ? "text-base md:text-lg" : "text-sm md:text-base"
                  }`}
                >
                  {subtitle}
                </p>
              )}

              {/* CTA Button */}
              <button
                className={`inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg ${
                  isHero
                    ? "px-6 py-3 text-sm bg-gradient-to-r from-[#FF6A1A] to-[#E8530A] text-white shadow-lg shadow-[#FF6A1A]/30"
                    : "px-5 py-2.5 text-sm bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20"
                }`}
              >
                {isHero ? "Shop Now" : "View Deals"}
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
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
              </button>
            </div>

            {/* Right: Visual accent */}
            <div className="hidden md:flex items-center justify-center flex-shrink-0">
              <div className="relative">
                {/* Large percentage/offer display */}
                <div
                  className={`${
                    isHero ? "w-40 h-40 lg:w-48 lg:h-48" : "w-32 h-32 lg:w-40 lg:h-40"
                  } rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center`}
                >
                  <span className="text-xs text-white/50 uppercase tracking-wider font-medium">
                    {isHero ? "Up to" : "Save"}
                  </span>
                  <span
                    className={`font-black bg-clip-text text-transparent ${
                      isHero ? "text-5xl lg:text-6xl" : "text-4xl lg:text-5xl"
                    }`}
                    style={{
                      backgroundImage: isHero
                        ? "linear-gradient(135deg, #FF6A1A, #FFB382)"
                        : "linear-gradient(135deg, #E8530A, #FF6A1A)",
                    }}
                  >
                    25%
                  </span>
                  <span className="text-xs text-white/50 uppercase tracking-wider font-medium">
                    off
                  </span>
                </div>

                {/* Decorative ring */}
                <div
                  className={`absolute inset-0 ${
                    isHero ? "-m-3" : "-m-2"
                  } rounded-full border-2 border-dashed border-white/10 animate-spin`}
                  style={{ animationDuration: "20s" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom edge gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Carousel indicators */}
      {ads.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
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
                  : "bg-white/30 w-1.5 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvertisementBanner;
