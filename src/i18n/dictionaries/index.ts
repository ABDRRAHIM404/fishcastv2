import { ar } from '@/i18n/dictionaries/ar';
import { en } from '@/i18n/dictionaries/en';
import { fr } from '@/i18n/dictionaries/fr';
import type { Locale } from '@/i18n/config';
import type {
  Dictionary,
  TranslationArgs,
  TranslationKey,
  Translator,
} from '@/i18n/types';

export const DICTIONARIES: Readonly<Record<Locale, Dictionary>> = {
  en,
  fr,
  ar,
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en;
}

export function createTranslator(locale: Locale): Translator {
  const dictionary = getDictionary(locale);
  return function translate<Key extends TranslationKey>(
    key: Key,
    ...args: TranslationArgs<Key>
  ): string {
    const candidate = dictionary[key];
    const fallback = en[key];
    const value =
      typeof candidate === 'string' && candidate.trim().length === 0
        ? fallback
        : candidate ?? fallback;
    if (typeof value === 'function') {
      return (value as (...functionArgs: TranslationArgs<Key>) => string)(
        ...args
      );
    }
    return value;
  };
}

