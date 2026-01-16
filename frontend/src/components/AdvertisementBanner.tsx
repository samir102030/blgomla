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

  // Fetch advertisements on mount
  useEffect(() => {
    console.log(`Fetching ads for position: ${position}`);
    fetchActiveAdvertisements();
  }, [fetchActiveAdvertisements]);

  // Filter ads by position
  const ads = activeAdvertisements.filter((ad) => ad.position === position);

  // Track views and setup rotation
  useEffect(() => {
    if (ads.length > 0) {
      const currentAd = ads[currentIndex];

      // Track view only once per ad
      if (!viewTracked.has(currentAd._id)) {
        console.log(`Tracking view for ad: ${currentAd.title}`);
        incrementViewCount(currentAd._id);
        setViewTracked(prev => new Set(prev).add(currentAd._id));
      }

      // Show popup if position is popup and not closed
      if (position === "popup" && !showPopup && !popupClosed) {
        // Check if popup was closed in this session
        const popupClosedSession = sessionStorage.getItem('popupClosed');
        if (!popupClosedSession) {
          setShowPopup(true);
        }
      }

      // Auto-rotate ads every 5 seconds
      if (ads.length > 1 && position !== "popup") {
        const interval = setInterval(() => {
          setCurrentIndex((prev) => (prev + 1) % ads.length);
        }, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [ads, currentIndex, position, incrementViewCount, viewTracked, showPopup, popupClosed]);

  if (ads.length === 0) {
    console.log(`No ads found for position: ${position}`);
    return null;
  }

  const currentAd = ads[currentIndex];

  const handleClick = () => {
    console.log(`Ad clicked: ${currentAd.title}`);
    incrementClickCount(currentAd._id);
    if (currentAd.link) {
      // Check if internal link
      if (currentAd.link.startsWith('/')) {
        window.location.href = currentAd.link;
      } else {
        window.open(currentAd.link, "_blank");
      }
    }
  };

  const handleClosePopup = () => {
    console.log('Closing popup');
    setShowPopup(false);
    setPopupClosed(true);
    // Store in session storage so it doesn't show again during this session
    sessionStorage.setItem('popupClosed', 'true');
  };

  // Popup Advertisement
  if (position === "popup" && showPopup) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleClosePopup}
      >
        <div
          className="relative bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClosePopup}
            className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 z-10 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div
            onClick={handleClick}
            className="cursor-pointer"
          >
            <img
              src={currentAd.image}
              alt={currentAd.title}
              className="w-full h-auto max-h-[85vh] object-contain bg-gray-50"
              loading="eager"
            />
          </div>
        </div>
      </div>
    );
  }

  // Hero Advertisement
  if (position === "hero") {
    return (
      <div
        onClick={handleClick}
        className="relative w-full max-h-[300px] md:max-h-[400px] cursor-pointer overflow-hidden rounded-lg shadow-lg"
      >
        <img
          src={currentAd.image}
          alt={currentAd.title}
          className="w-full h-full object-contain bg-gray-100"
          loading="lazy"
        />
        {currentAd.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 md:p-6">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 md:mb-2">
              {currentAd.title}
            </h2>
            {currentAd.description && (
              <p className="text-sm md:text-base text-white/90 line-clamp-2">{currentAd.description}</p>
            )}
          </div>
        )}
        {ads.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? "bg-white w-4" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Banner Advertisement
  if (position === "banner") {
    return (
      <div
        onClick={handleClick}
        className="relative w-full cursor-pointer overflow-hidden rounded-lg my-6 shadow-md hover:shadow-xl transition-shadow bg-gradient-to-r from-gray-50 to-gray-100"
      >
        <img
          src={currentAd.image}
          alt={currentAd.title}
          className="w-full h-auto object-cover"
          style={{ maxHeight: '250px', minHeight: '150px' }}
          loading="lazy"
        />
        {currentAd.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <h3 className="text-white font-semibold text-sm md:text-base">
              {currentAd.title}
            </h3>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default AdvertisementBanner;

