import i18n from "i18next"
import { initReactI18next } from "react-i18next"

// Import all your language files
import en from "./en.json";
import ar from "./ar.json";

import fr from "./fr.json";
import zh from "./zh.json";
import es from "./es.json";
import ru from "./ru.json";
import ja from "./ja.json";
import de from "./de.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },

    fr: { translation: fr },
    zh: { translation: zh },
    es: { translation: es },
    ru: { translation: ru },
    ja: { translation: ja },
    de: { translation: de },
  },
  lng: "en", // default language
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  // Add RTL support
  react: {
    useSuspense: false,
  },
})

export default i18n;