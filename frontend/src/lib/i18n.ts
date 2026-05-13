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

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);
  if (!i18n.hasResourceBundle(lng, "translation")) {
    loadLanguage(lng);
  }
});

export default i18n;
