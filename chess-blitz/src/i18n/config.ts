// ==============================================
// Chess Blitz - Internationalization Configuration
// ==============================================

export const locales = [
  'en', 'id', 'ms', 'cs', 'da', 'de', 'es', 'fr', 'it', 'hu',
  'nl', 'no', 'uz', 'pl', 'pt', 'ru', 'ro', 'sk', 'sr', 'fi',
  'sv', 'tl', 'tr', 'el', 'bg', 'uk', 'he', 'ar', 'hi', 'bn',
  'th', 'ko', 'ja', 'zh'
] as const;

export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'en';

export const rtlLocales: Locale[] = ['ar', 'he'];

// Display names for each locale (in their native language)
export const localeNames: Record<Locale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  cs: 'Čeština',
  da: 'Dansk',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  hu: 'Magyar',
  nl: 'Nederlands',
  no: 'Norsk',
  uz: "O'zbek",
  pl: 'Polski',
  pt: 'Português',
  ru: 'Русский',
  ro: 'Română',
  sk: 'Slovenčina',
  sr: 'Srpski',
  fi: 'Suomi',
  sv: 'Svenska',
  tl: 'Tagalog',
  tr: 'Türkçe',
  el: 'Ελληνικά',
  bg: 'български',
  uk: 'Українська',
  he: 'עִברִית',
  ar: 'عربي',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  th: 'ภาษาไทย',
  ko: '한국어',
  ja: '日本語',
  zh: '简体中文',
};

// ISO 3166-1 alpha-2 country codes for flag icons
export const localeCountries: Record<Locale, string> = {
  en: 'US',
  id: 'ID',
  ms: 'MY',
  cs: 'CZ',
  da: 'DK',
  de: 'DE',
  es: 'ES',
  fr: 'FR',
  it: 'IT',
  hu: 'HU',
  nl: 'NL',
  no: 'NO',
  uz: 'UZ',
  pl: 'PL',
  pt: 'BR',
  ru: 'RU',
  ro: 'RO',
  sk: 'SK',
  sr: 'RS',
  fi: 'FI',
  sv: 'SE',
  tl: 'PH',
  tr: 'TR',
  el: 'GR',
  bg: 'BG',
  uk: 'UA',
  he: 'IL',
  ar: 'SA',
  hi: 'IN',
  bn: 'BD',
  th: 'TH',
  ko: 'KR',
  ja: 'JP',
  zh: 'CN',
};

/**
 * Check if a locale uses RTL (Right-to-Left) text direction
 */
export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/**
 * Type guard to check if a string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
