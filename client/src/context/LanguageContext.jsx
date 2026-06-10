import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

const STORAGE_KEY = 'language';
const DEFAULT_LANG = 'en';
const SUPPORTED = ['en', 'am'];

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.includes(stored) ? stored : DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };

  const t = (key, vars) => {
    const dict = translations[lang] || translations[DEFAULT_LANG];
    let str = dict[key] ?? translations[DEFAULT_LANG][key] ?? key;
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
      }
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
