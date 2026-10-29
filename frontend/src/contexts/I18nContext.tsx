/** Langue et traduction (patron SAGA I18nContext.tsx) ; dictionnaire dans src/i18n.ts. */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, type Lang } from '../i18n';

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  tField: (obj: Record<string, unknown> | null | undefined, field: string) => string;
}

const I18nContext = createContext<I18nContextType>(null!);

export function I18nProvider({ children, defaultLang = 'fr' }: { children: React.ReactNode; defaultLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  useEffect(() => { setLang(defaultLang); }, [defaultLang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const t = useCallback((key: string) => translations[key]?.[lang] || translations[key]?.fr || key, [lang]);
  const tField = useCallback((obj: Record<string, unknown> | null | undefined, field: string) => {
    if (!obj) return '';
    return String(obj[`${field}_${lang}`] ?? obj[`${field}_fr`] ?? obj[field] ?? '');
  }, [lang]);
  return <I18nContext.Provider value={{ lang, setLang, t, tField }}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }
