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
      // Translations arrive after init — `resources` starts empty and each
      // language is fetched as a chunk — and react-i18next re-renders on
      // `languageChanged` alone by default. So the first switch to a
      // language emitted that event while its bundle was still in flight:
      // every component re-read `t()`, got nothing, and fell back to
      // English. The bundle landed a moment later and nothing asked again,
      // which is why the page stayed English until it was reloaded while
      // the header — busy re-rendering for its own reasons — appeared to
      // work. `added` is the store event addResourceBundle fires.
      bindI18nStore: "added",
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
  // Still here for a changeLanguage() called directly somewhere else, or
  // one i18next resolves on its own. setLanguage below is the front door.
  if (!i18n.hasResourceBundle(lng, "translation")) {
    loadLanguage(lng);
  }
  syncManifestToLanguage(lng);
});

/**
 * Switch the interface language.
 *
 * Fetches the bundle before announcing the change, so the interface goes
 * straight from one language to the other. Calling i18n.changeLanguage()
 * directly still works — bindI18nStore catches the late bundle — but shows
 * a frame of English on the way.
 */
export const switchLanguage = async (lng: string) => {
  if (lng === i18n.language) return;
  if (!i18n.hasResourceBundle(lng, "translation")) await loadLanguage(lng);
  await i18n.changeLanguage(lng);
};

// index.html ships the EN manifest; if the saved language is AR, swap on boot.
syncManifestToLanguage(savedLanguage);

export default i18n;
