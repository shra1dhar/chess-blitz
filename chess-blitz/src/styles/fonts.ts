import {
  Noto_Serif_Display,
  Noto_Naskh_Arabic,
  Noto_Serif_Hebrew,
  Noto_Serif_Devanagari,
  Noto_Serif_Bengali,
  Noto_Serif_Thai,
  Noto_Serif_KR,
  Noto_Serif_JP,
  Noto_Serif_SC,
} from 'next/font/google';
import type { Locale } from '@/i18n/config';

// Latin, Cyrillic, Greek scripts
const notoSerifDisplay = Noto_Serif_Display({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Arabic script
const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Hebrew script
const notoSerifHebrew = Noto_Serif_Hebrew({
  subsets: ['hebrew'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Devanagari script (Hindi)
const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Bengali script
const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Thai script
const notoSerifThai = Noto_Serif_Thai({
  subsets: ['thai'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Korean script
const notoSerifKR = Noto_Serif_KR({
  preload: false,
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Japanese script
const notoSerifJP = Noto_Serif_JP({
  preload: false,
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Chinese Simplified script
const notoSerifSC = Noto_Serif_SC({
  preload: false,
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// Font map by locale
const fontMap = {
  // Latin script (includes Cyrillic, Greek)
  en: notoSerifDisplay,
  id: notoSerifDisplay,
  ms: notoSerifDisplay,
  cs: notoSerifDisplay,
  da: notoSerifDisplay,
  de: notoSerifDisplay,
  es: notoSerifDisplay,
  fr: notoSerifDisplay,
  it: notoSerifDisplay,
  hu: notoSerifDisplay,
  nl: notoSerifDisplay,
  no: notoSerifDisplay,
  uz: notoSerifDisplay,
  pl: notoSerifDisplay,
  pt: notoSerifDisplay,
  ro: notoSerifDisplay,
  sk: notoSerifDisplay,
  fi: notoSerifDisplay,
  sv: notoSerifDisplay,
  tl: notoSerifDisplay,
  tr: notoSerifDisplay,
  el: notoSerifDisplay, // Greek
  ru: notoSerifDisplay, // Cyrillic
  uk: notoSerifDisplay, // Cyrillic
  bg: notoSerifDisplay, // Cyrillic
  sr: notoSerifDisplay, // Cyrillic
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
  return fontMap[locale] || notoSerifDisplay;
}

// Export for English layout (always Latin)
export { notoSerifDisplay };
