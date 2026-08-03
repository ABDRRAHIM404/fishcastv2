import 'server-only';
import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE_KEY, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { resolveLocalePreference } from '@/i18n/locale';

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocalePreference({
    persisted: cookieStore.get(LOCALE_COOKIE_KEY)?.value,
    languages: headerStore.get('accept-language'),
  });
}

export async function getServerDictionary() {
  const locale = await getRequestLocale();
  return { locale, messages: getDictionary(locale) };
}

