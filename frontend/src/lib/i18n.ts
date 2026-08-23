import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * Which language a visitor who has never been here gets.
 *
 * This was `localStorage.getItem("language") || "en"`. Every first-time
 * visitor to an Arabic-first Egyptian wholesaler therefore landed in English,
 * left-to-right, including the ones whose browser had been asking for Arabic
 * the whole time — and the 5,656 electronics products, whose only Arabic is
 * their name, read as an English catalogue with Arabic titles.
 *
 * Three signals, in the order they deserve:
 *
 *   1. A choice already made here. It is the only one that is certainly about
 *      this shop, so nothing overrides it.
 *   2. What the browser asks for. `navigator.languages` is the visitor's own
 *      ordered preference list, and the first entry that is either Arabic or
 *      English is the answer — so an ar-EG reader gets Arabic and an en-GB
 *      reader still gets English.
 *   3. Arabic, because that is what this shop is written in and what its
 *      customers speak. A visitor who wants English is one click away and the
 *      click is remembered; a visitor who wants Arabic was previously three
 *      screens deep in the wrong language before finding the switch.
 */
const detectLanguage = (): string => {
  const chosen = localStorage.getItem("language");
  if (chosen === "ar" || chosen === "en") return chosen;

  const asked =
    typeof navigator !== "undefined"
      ? navigator.languages?.length
        ? navigator.languages
        : [navigator.language]
      : [];

  for (const tag of asked) {
    const code = String(tag || "").toLowerCase();
    if (code.startsWith("ar")) return "ar";
    if (code.startsWith("en")) return "en";
  }
  return "ar";
};

const savedLanguage = detectLanguage();

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

/*
  The document has to agree before the first paint.

  index.html is served as lang="en" with no dir, and App only sets the
  direction inside an effect — so an Arabic visitor got a left-to-right frame
  first and a right-to-left one a moment later. Setting it here, at module
  scope, means it is already right when React mounts. It also matters when
  React never mounts at all: a crawler reading the served markup sees the
  language the page is actually in.
*/
if (typeof document !== "undefined") {
  document.documentElement.lang = savedLanguage;
  document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
}

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
