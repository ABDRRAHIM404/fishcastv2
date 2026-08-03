import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type Locale,
} from '@/i18n/config';

function languageTagLocale(tag: string): Locale | null {
  const primary = tag.trim().split(';')[0]?.split('-')[0]?.toLowerCase();
  if (primary === 'fr') return 'fr';
  if (primary === 'ar') return 'ar';
  if (primary === 'en') return 'en';
  return null;
}

function languagePreference(value: string, index: number) {
  const qualityMatch = value.match(/(?:^|;)\s*q=([01](?:\.\d+)?)\s*$/i);
  return {
    value,
    index,
    quality: qualityMatch ? Number(qualityMatch[1]) : 1,
  };
}

/** Chooses the first supported language in an Accept-Language style list. */
export function detectLocaleFromLanguages(
  languages: readonly string[] | string | null | undefined
): Locale {
  const values = (Array.isArray(languages)
    ? languages
    : typeof languages === 'string'
      ? languages.split(',')
      : [])
    .map(languagePreference)
    .filter(({ quality }) => quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { value } of values) {
    const locale = languageTagLocale(value);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
}

/** A present but invalid persisted preference must not trigger auto-detection. */
export function resolveLocalePreference({
  persisted,
  languages,
}: {
  persisted: string | null | undefined;
  languages: readonly string[] | string | null | undefined;
}): Locale {
  if (persisted !== null && persisted !== undefined) {
    return isSupportedLocale(persisted)
      ? persisted.toLowerCase() as Locale
      : DEFAULT_LOCALE;
  }
  return detectLocaleFromLanguages(languages);
}

export function serializeLocalePreference(locale: Locale): string {
  return locale;
}

export function parseLocalePreference(value: string | null): Locale {
  return isSupportedLocale(value) ? value.toLowerCase() as Locale : DEFAULT_LOCALE;
}

/** Locale changes never translate or otherwise rewrite route/query identifiers. */
export function preserveLocaleSwitchRoute(
  pathname: string,
  search = '',
  hash = ''
): string {
  const query = search && !search.startsWith('?') ? `?${search}` : search;
  const fragment = hash && !hash.startsWith('#') ? `#${hash}` : hash;
  return `${pathname}${query}${fragment}`;
}
