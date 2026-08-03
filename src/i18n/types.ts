import type { en } from '@/i18n/dictionaries/en';

export type TranslationKey = keyof typeof en;

export type Dictionary = {
  [Key in TranslationKey]: (typeof en)[Key] extends (
    ...args: infer Args
  ) => string
    ? (...args: Args) => string
    : string;
};

export type TranslationArgs<Key extends TranslationKey> =
  Dictionary[Key] extends (...args: infer Args) => string ? Args : [];

export type Translator = <Key extends TranslationKey>(
  key: Key,
  ...args: TranslationArgs<Key>
) => string;

