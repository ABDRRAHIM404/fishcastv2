export const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TextDirection = 'ltr' | 'rtl';

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE_KEY = 'fishcast_locale_v1';
export const LOCALE_STORAGE_KEY = 'fishcast_locale_v1';

export const INTL_LOCALE: Readonly<Record<Locale, string>> = {
  en: 'en-GB',
  fr: 'fr-MA',
  ar: 'ar-MA-u-nu-latn',
};

export const LOCALE_DIRECTION: Readonly<Record<Locale, TextDirection>> = {
  en: 'ltr',
  fr: 'ltr',
  ar: 'rtl',
};

export const LOCALE_SHORT_LABEL: Readonly<Record<Locale, string>> = {
  en: 'EN',
  fr: 'FR',
  ar: 'AR',
};

export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' &&
    SUPPORTED_LOCALES.includes(value.toLowerCase() as Locale)
  );
}

/** Invalid persisted values deliberately fall back to English. */
export function localeOrFallback(value: unknown): Locale {
  return isSupportedLocale(value) ? value.toLowerCase() as Locale : DEFAULT_LOCALE;
}

export function directionForLocale(locale: Locale): TextDirection {
  return LOCALE_DIRECTION[locale];
}

