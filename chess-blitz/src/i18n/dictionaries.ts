// ==============================================
// Chess Blitz - Dictionary Loader
// Server-only module for loading translation dictionaries
// ==============================================

import 'server-only';
import type { Locale } from './config';

// Dynamic imports for all dictionaries
const dictionaries = {
  en: () => import('./dictionaries/en.json').then((m) => m.default),
  id: () => import('./dictionaries/id.json').then((m) => m.default),
  ms: () => import('./dictionaries/ms.json').then((m) => m.default),
  cs: () => import('./dictionaries/cs.json').then((m) => m.default),
  da: () => import('./dictionaries/da.json').then((m) => m.default),
  de: () => import('./dictionaries/de.json').then((m) => m.default),
  es: () => import('./dictionaries/es.json').then((m) => m.default),
  fr: () => import('./dictionaries/fr.json').then((m) => m.default),
  it: () => import('./dictionaries/it.json').then((m) => m.default),
  hu: () => import('./dictionaries/hu.json').then((m) => m.default),
  nl: () => import('./dictionaries/nl.json').then((m) => m.default),
  no: () => import('./dictionaries/no.json').then((m) => m.default),
  uz: () => import('./dictionaries/uz.json').then((m) => m.default),
  pl: () => import('./dictionaries/pl.json').then((m) => m.default),
  pt: () => import('./dictionaries/pt.json').then((m) => m.default),
  ru: () => import('./dictionaries/ru.json').then((m) => m.default),
  ro: () => import('./dictionaries/ro.json').then((m) => m.default),
  sk: () => import('./dictionaries/sk.json').then((m) => m.default),
  sr: () => import('./dictionaries/sr.json').then((m) => m.default),
  fi: () => import('./dictionaries/fi.json').then((m) => m.default),
  sv: () => import('./dictionaries/sv.json').then((m) => m.default),
  tl: () => import('./dictionaries/tl.json').then((m) => m.default),
  tr: () => import('./dictionaries/tr.json').then((m) => m.default),
  el: () => import('./dictionaries/el.json').then((m) => m.default),
  bg: () => import('./dictionaries/bg.json').then((m) => m.default),
  uk: () => import('./dictionaries/uk.json').then((m) => m.default),
  he: () => import('./dictionaries/he.json').then((m) => m.default),
  ar: () => import('./dictionaries/ar.json').then((m) => m.default),
  hi: () => import('./dictionaries/hi.json').then((m) => m.default),
  bn: () => import('./dictionaries/bn.json').then((m) => m.default),
  th: () => import('./dictionaries/th.json').then((m) => m.default),
  ko: () => import('./dictionaries/ko.json').then((m) => m.default),
  ja: () => import('./dictionaries/ja.json').then((m) => m.default),
  zh: () => import('./dictionaries/zh.json').then((m) => m.default),
};

// Export the Dictionary type based on the English dictionary structure
export type Dictionary = Awaited<ReturnType<typeof dictionaries.en>>;

/**
 * Load the dictionary for a given locale.
 * Falls back to English if the locale is not found.
 */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = dictionaries[locale];
  if (loader) {
    return loader();
  }
  // Fallback to English
  return dictionaries.en();
}
