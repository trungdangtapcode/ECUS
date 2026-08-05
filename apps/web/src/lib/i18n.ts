import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import vi from "../locales/vi.json";

export const supportedLocales = ["vi", "en"] as const;
export type Locale = (typeof supportedLocales)[number];
const storageKey = "ecus.locale";

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(storageKey);
    if (supportedLocales.includes(saved as Locale)) return saved as Locale;
  } catch {
    /* Storage is optional in private browser contexts. */
  }
  const configured = import.meta.env.VITE_DEFAULT_LOCALE;
  return supportedLocales.includes(configured as Locale) ? (configured as Locale) : "vi";
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: initialLocale(),
  fallbackLng: "en",
  supportedLngs: [...supportedLocales],
  interpolation: { escapeValue: false },
});

function updateDocument(language: string) {
  document.documentElement.lang = language;
  document.title = i18n.t("app.name");
  try {
    localStorage.setItem(storageKey, language);
  } catch {
    /* Optional preference. */
  }
}
updateDocument(i18n.language);
i18n.on("languageChanged", updateDocument);

export default i18n;
