import type { Locale } from '@/i18n/config';

// Import fonts from separate files (each file only loads when imported)
import { notoSerifLatin } from './fonts/latin';
import { notoSerifLatinExt } from './fonts/latin-ext';
import { notoSerifCyrillic } from './fonts/cyrillic';
import { notoSerifGreek } from './fonts/greek';
import { notoNaskhArabic } from './fonts/arabic';
import { notoSerifHebrew } from './fonts/hebrew';
import { notoSerifDevanagari } from './fonts/devanagari';
import { notoSerifBengali } from './fonts/bengali';
import { notoSerifThai } from './fonts/thai';
import { notoSerifKR } from './fonts/korean';
import { notoSerifJP } from './fonts/japanese';
import { notoSerifSC } from './fonts/chinese';

// Font map by locale
const fontMap = {
  // Latin only (basic ASCII)
  en: notoSerifLatin,
  id: notoSerifLatin,
  ms: notoSerifLatin,
  tl: notoSerifLatin,
  // Latin extended (languages with diacritics)
  cs: notoSerifLatinExt,
  da: notoSerifLatinExt,
  de: notoSerifLatinExt,
  es: notoSerifLatinExt,
  fr: notoSerifLatinExt,
  it: notoSerifLatinExt,
  hu: notoSerifLatinExt,
  nl: notoSerifLatinExt,
  no: notoSerifLatinExt,
  uz: notoSerifLatinExt,
  pl: notoSerifLatinExt,
  pt: notoSerifLatinExt,
  ro: notoSerifLatinExt,
  sk: notoSerifLatinExt,
  fi: notoSerifLatinExt,
  sv: notoSerifLatinExt,
  tr: notoSerifLatinExt,
  // Greek
  el: notoSerifGreek,
  // Cyrillic
  ru: notoSerifCyrillic,
  uk: notoSerifCyrillic,
  bg: notoSerifCyrillic,
  sr: notoSerifCyrillic,
  // Non-Latin scripts
  ar: notoNaskhArabic,
  he: notoSerifHebrew,
  hi: notoSerifDevanagari,
  bn: notoSerifBengali,
  th: notoSerifThai,
  ko: notoSerifKR,
  ja: notoSerifJP,
  zh: notoSerifSC,
} as const;

export function getDisplayFont(locale: Locale) {
  return fontMap[locale] || notoSerifLatin;
}

// Re-export for backwards compatibility
export { notoSerifLatin };
