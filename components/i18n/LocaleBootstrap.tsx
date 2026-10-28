'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { getStoredLocale, setLocale } from './LocaleSwitcher';

/**
 * Mount this once, high in app/[locale]/layout.tsx's client tree.
 * Handles the case where a PWA launched from a home-screen icon starts with
 * no cookie (some WebViews drop first-party cookies on cold start) but
 * localStorage from a previous session already has a locale choice. If the
 * two disagree, localStorage wins and the cookie is resynced.
 *
 * Renders nothing.
 */
export function LocaleBootstrap() {
  const router = useRouter();
  const { locale: serverLocale } = useDictionary();

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored && stored !== serverLocale) {
      setLocale(stored);
      router.refresh();
    }
    // Runs once per mount (route change), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
