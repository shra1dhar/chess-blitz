import { Noto_Serif_Display } from 'next/font/google';

// Latin extended (languages with diacritics - German, French, Spanish, etc.)
export const notoSerifLatinExt = Noto_Serif_Display({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
