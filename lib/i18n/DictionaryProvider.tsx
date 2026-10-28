'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Dictionary } from './dictionaries';
import type { Locale } from './config';

interface DictionaryContextValue {
  dict: Dictionary;
  locale: Locale;
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

/**
 * Wrap app/[locale]/layout.tsx's children with this, passing the dictionary
 * loaded server-side via getDictionary(locale). Client components (Header,
 * BottomNav, forms, etc.) then read strings via useDictionary() instead of
 * hardcoding French.
 */
export function DictionaryProvider({
  dict,
  locale,
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={{ dict, locale }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): DictionaryContextValue {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error('useDictionary() must be called within a DictionaryProvider');
  }
  return ctx;
}
