import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import fr from './locales/fr.json';
import en from './locales/en.json';
import it from './locales/it.json';
import ar from './locales/ar.json';

// Available languages configuration with flag image URLs
export const languages = [
  { code: 'fr', name: 'Français', flagCode: 'fr', shortCode: 'FR', dir: 'ltr' },
  { code: 'en', name: 'English', flagCode: 'gb', shortCode: 'GB', dir: 'ltr' },
  { code: 'it', name: 'Italiano', flagCode: 'it', shortCode: 'IT', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flagCode: 'tn', shortCode: 'TN', dir: 'rtl' }
];

// Get flag image URL from flagcdn.com
export const getFlagUrl = (flagCode, size = 40) => {
  return `https://flagcdn.com/w${size}/${flagCode}.png`;
};

// Get language direction
export const getLanguageDir = (lang) => {
  const language = languages.find(l => l.code === lang);
  return language ? language.dir : 'ltr';
};

// i18n configuration
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      it: { translation: it },
      ar: { translation: ar }
    },
    lng: localStorage.getItem('language') || 'fr',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Update document direction on language change
i18n.on('languageChanged', (lng) => {
  const dir = getLanguageDir(lng);
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
  localStorage.setItem('language', lng);
});

// Initialize direction on load
const initDir = getLanguageDir(i18n.language);
document.documentElement.dir = initDir;
document.documentElement.lang = i18n.language;

export default i18n;
