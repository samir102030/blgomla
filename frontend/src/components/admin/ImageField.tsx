import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";

/**
 * Picking the picture for a banner or a service card.
 *
 * Three ways in, because only two of them work everywhere: uploading needs
 * Cloudinary credentials on the API, and this server may not have them. Rather
 * than offer a file button that fails with "Server error" — which reads as a
 * bug in the page rather than as a setting nobody has filled in — the control
 * asks the API whether uploads are configured and says so plainly when they
 * are not, while leaving the two paths that never depend on it: an address
 * pasted in, and the pictures already shipped with the site.
 */

/** Shipped with the frontend, so always available whatever the API can do. */
const BUILT_IN = [
  { src: "/manus/banner-surveillance.webp", label: "Surveillance", labelAr: "المراقبة" },
  { src: "/manus/banner-fire.webp", label: "Fire alarm", labelAr: "إنذار الحريق" },
  { src: "/manus/banner-audio.webp", label: "Audio", labelAr: "الصوتيات" },
  { src: "/manus/banner-network.webp", label: "Networks", labelAr: "الشبكات" },
  { src: "/manus/banner-attendance.webp", label: "Attendance", labelAr: "الحضور" },
  { src: "/manus/banner-intercom.webp", label: "Intercom", labelAr: "الإنتركم" },
  { src: "/manus/hero-cctv-network.webp", label: "CCTV & network", labelAr: "كاميرات وشبكات" },
  { src: "/manus/solution-surveillance.webp", label: "Solution — surveillance", labelAr: "حل — المراقبة" },
  { src: "/manus/solution-network.webp", label: "Solution — network", labelAr: "حل — الشبكة" },
  { src: "/manus/solution-smart.webp", label: "Solution — smart", labelAr: "حل — ذكي" },
];

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** Aspect of the preview box. Banners are wide, service cards are squarer. */
  aspect?: "wide" | "card";
}

const ImageField: React.FC<Props> = ({ value, onChange, label, aspect = "wide" }) => {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n.language || "en").toLowerCase().startsWith("ar");
  const [uploading, setUploading] = useState(false);
  const [uploadsOn, setUploadsOn] = useState<boolean | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/upload/test")
      .then(({ data }) => {
        if (!cancelled) setUploadsOn(Boolean(data?.configured));
      })
      // A failed probe is not proof uploads are off, so the button stays and
      // the attempt reports whatever the real error turns out to be.
      .catch(() => {
        if (!cancelled) setUploadsOn(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const body = new FormData();
    body.append("image", file);

    setUploading(true);
    try {
      const { data } = await axiosInstance.post("/upload/upload", body);
      onChange(data.url);
      toast.success(t("imageField.uploaded", "Image uploaded"));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("imageField.uploadFailed", "Upload failed"));
    } finally {
      setUploading(false);
      // Clearing the input lets the same file be chosen twice in a row, which
      // is what happens after a failed attempt.
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      <div
        className={`relative w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 ${
          aspect === "wide" ? "aspect-[16/6]" : "aspect-[4/3]"
        }`}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
            <PhotoIcon className="h-8 w-8" />
            <span className="text-xs">{t("imageField.none", "No image yet")}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
            uploadsOn === false
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          {uploading ? t("imageField.uploading", "Uploading…") : t("imageField.upload", "Upload a file")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading || uploadsOn === false}
            onChange={handleUpload}
          />
        </label>

        <button
          type="button"
          onClick={() => setShowLibrary((open) => !open)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          {t("imageField.library", "Pick a shipped image")}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          >
            {t("imageField.clear", "Clear")}
          </button>
        )}
      </div>

      {uploadsOn === false && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t(
            "imageField.uploadsOff",
            "File upload is switched off on this server: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are not set on the API. Paste an image address below, or pick one of the shipped images."
          )}
        </p>
      )}

      {showLibrary && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 p-2 sm:grid-cols-5">
          {BUILT_IN.map((item) => (
            <button
              key={item.src}
              type="button"
              onClick={() => {
                onChange(item.src);
                setShowLibrary(false);
              }}
              className={`group overflow-hidden rounded-md border-2 transition-colors ${
                value === item.src ? "border-[#00A8E8]" : "border-transparent hover:border-gray-300"
              }`}
              title={isArabic ? item.labelAr : item.label}
            >
              <img src={item.src} alt={isArabic ? item.labelAr : item.label} className="h-14 w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://res.cloudinary.com/…  |  /manus/banner-audio.webp"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A8E8] focus:border-transparent"
        dir="ltr"
      />
    </div>
  );
};

export default ImageField;
