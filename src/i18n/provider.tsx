'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  directionForLocale,
  type Locale,
  type TextDirection,
} from '@/i18n/config';
import { createTranslator, getDictionary } from '@/i18n/dictionaries';
import { preserveLocaleSwitchRoute } from '@/i18n/locale';
import type { Dictionary, Translator } from '@/i18n/types';

interface I18nContextValue {
  locale: Locale;
  direction: TextDirection;
  messages: Dictionary;
  t: Translator;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function persistLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Cookie remains the SSR source of truth when storage is restricted.
  }
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
    document.documentElement.lang = initialLocale;
    document.documentElement.dir = directionForLocale(initialLocale);
    persistLocale(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      const currentRoute = preserveLocaleSwitchRoute(
        window.location.pathname,
        window.location.search,
        window.location.hash
      );
      const direction = directionForLocale(nextLocale);
      setLocaleState(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = direction;
      persistLocale(nextLocale);
      window.history.replaceState(window.history.state, '', currentRoute);
      router.refresh();
    },
    [router]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction: directionForLocale(locale),
      messages: getDictionary(locale),
      t: createTranslator(locale),
      setLocale,
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside LocaleProvider');
  return value;
}
