'use client';

import { useRouter } from 'next/navigation';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { LOCALES, LOCALE_LABELS, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';

const LOCAL_STORAGE_KEY = 'shadow_ui_locale';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persists to BOTH cookie (read by middleware.ts on the next request) and
 * localStorage (belt-and-suspenders: some PWA home-screen launch paths in
 * iOS/Android WebViews have dropped or delayed first-party cookies on cold
 * start — localStorage survives that and can reconcile on mount, see
 * LocaleBootstrap below). The cookie is the source of truth for routing.
 */
export function setLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, locale);
  } catch {
    // localStorage unavailable (private mode, quota) — cookie already set, non-fatal.
  }
}

export function getStoredLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (value && (LOCALES as readonly string[]).includes(value)) {
      return value as Locale;
    }
  } catch {
    // ignore
  }
  return null;
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const { locale, dict } = useDictionary();

  function handleSelect(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    router.refresh();
  }

  return (
    <label className={className}>
      <span className="sr-only">{dict.common.interfaceLanguage}</span>
      <select
        value={locale}
        onChange={(e) => handleSelect(e.target.value as Locale)}
        aria-label={dict.common.interfaceLanguage}
        className="bg-surface-subtle text-xs font-semibold text-text rounded px-2 py-1 border border-surface-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-surface-elevated transition-colors"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} className="bg-surface text-text">
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
