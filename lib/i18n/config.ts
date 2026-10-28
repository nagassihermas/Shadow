export const LOCALES = ['fr', 'en', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

/**
 * Interface-language cookie. Distinct from any cookie/localStorage key used
 * for the *target* language (EN/ZH) the user is studying — that selector in
 * Header.tsx is unrelated and must not be merged with this one.
 */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  zh: '中文',
};
