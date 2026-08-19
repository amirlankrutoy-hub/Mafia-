import React, { createContext, useContext, useState, useCallback } from "react";
import { translations, LANGUAGES } from "../i18n/index";

const STORAGE_KEY = "mafia_language";

const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch {
    // localStorage недоступен — используем язык по умолчанию
  }
  return "ru";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((code) => {
    if (!translations[code]) return;
    setLanguageState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // игнорируем — язык всё равно применится на эту сессию
    }
  }, []);

  const t = useCallback(
    (key) => {
      return translations[language]?.[key] ?? translations.ru[key] ?? key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage должен использоваться внутри LanguageProvider");
  }
  return ctx;
}
