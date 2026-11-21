import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messages, type Locale, type Messages } from '@apna-okara/shared';

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** t('home.heroTitle') */
  t: (key: string, vars?: Record<string, string | number>) => string;
  isUrdu: boolean;
};

const I18nContext = createContext<Ctx | null>(null);
const STORAGE_KEY = 'apna-okara.locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'ur') setLocaleState(v);
      })
      .catch(() => {});
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    const dict: Messages = messages[locale];
    return {
      locale,
      setLocale,
      isUrdu: locale === 'ur',
      t: (key: string, vars?: Record<string, string | number>) => {
        let cur: unknown = dict;
        for (const part of key.split('.')) cur = (cur as Record<string, unknown> | undefined)?.[part];
        if (typeof cur !== 'string') return key;
        return vars ? cur.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : cur;
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
