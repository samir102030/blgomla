import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const savedLanguage = localStorage.getItem("language") || "en";

const loadLanguage = async (lng: string) => {
  const mod = lng === "ar"
    ? await import("../locales/ar.json")
    : await import("../locales/en.json");
  i18n.addResourceBundle(lng, "translation", mod.default, true, true);
};

i18n
  .use(initReactI18next)
  .init({
    lng: savedLanguage,
    fallbackLng: "en",
    resources: {},
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

loadLanguage(savedLanguage);

// Keep the PWA manifest in sync with the active UI language so the
// "Install app" / "Add to home screen" dialog shows the right name and
// text direction. Browsers re-fetch the manifest when href changes.
const syncManifestToLanguage = (lng: string) => {
  if (typeof document === "undefined") return;
  const link = document.getElementById("webmanifest") as HTMLLinkElement | null;
  if (!link) return;
  const target = lng === "ar" ? "/manifest.ar.json" : "/manifest.json";
  if (!link.href.endsWith(target)) link.href = target;
};

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);
  if (!i18n.hasResourceBundle(lng, "translation")) {
    loadLanguage(lng);
  }
  syncManifestToLanguage(lng);
});

// index.html ships the EN manifest; if the saved language is AR, swap on boot.
syncManifestToLanguage(savedLanguage);

export default i18n;
