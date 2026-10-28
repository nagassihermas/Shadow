import 'server-only';
import type { Locale } from './config';

// Static imports (not dynamic `import()`) so each locale bundle is included
// in the server build deterministically and TypeScript can check key shape
// against the reference dictionary (fr.json, the source of truth).
import fr from './dictionaries/fr.json';
import en from './dictionaries/en.json';
import zh from './dictionaries/zh.json';

export type Dictionary = typeof fr;

const dictionaries: Record<Locale, Dictionary> = { fr, en, zh };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.fr;
}
