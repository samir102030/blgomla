import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FireIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAdvertisementStore } from "../stores/advertisement.store";

const DISMISS_KEY = "announcementClosed";

const AnnouncementBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const {
    activeAdvertisements,
    fetchActiveAdvertisements,
    incrementViewCount,
    incrementClickCount,
  } = useAdvertisementStore();

  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "true"
  );
  const [viewTracked, setViewTracked] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchActiveAdvertisements();
  }, [fetchActiveAdvertisements]);

  const ads = activeAdvertisements.filter((ad) => ad.position === "announcement");

  useEffect(() => {
    if (ads.length === 0 || dismissed) return;
    const current = ads[index % ads.length];
    if (current && !viewTracked.has(current._id)) {
      incrementViewCount(current._id);
      setViewTracked((prev) => new Set(prev).add(current._id));
    }
    if (ads.length > 1) {
      const timer = setInterval(
        () => setIndex((i) => (i + 1) % ads.length),
        6000
      );
      return () => clearInterval(timer);
    }
  }, [ads, index, dismissed, incrementViewCount, viewTracked]);

  if (ads.length === 0 || dismissed) return null;

  const current = ads[index % ads.length];
  const text =
    (isRtl && (current.titleAr || current.subtitleAr)) ||
    current.title ||
    current.subtitle ||
    "";
  const sub =
    (isRtl && current.subtitleAr) || current.subtitle || "";

  const handleClick = () => {
    if (!current.link) return;
    incrementClickCount(current._id);
    if (current.link.startsWith("/")) {
      window.location.href = current.link;
    } else {
      window.open(current.link, "_blank");
    }
  };

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "true");
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      onClick={handleClick}
      className={`relative w-full bg-gradient-to-r from-[#00A8E8] via-[#0077B6] to-[#00A8E8] text-white text-center text-xs sm:text-sm font-medium px-10 py-2 ${
        current.link ? "cursor-pointer" : ""
      }`}
    >
      <span className="inline-flex items-center gap-2 justify-center flex-wrap">
        <span aria-hidden="true"><FireIcon className="w-5 h-5" aria-hidden="true" /></span>
        <span className="font-semibold">{text}</span>
        {sub && sub !== text && (
          <span className="opacity-90 font-normal">— {sub}</span>
        )}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("Dismiss")}
        className="absolute top-1/2 -translate-y-1/2 ltr:right-2 rtl:left-2 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AnnouncementBar;
