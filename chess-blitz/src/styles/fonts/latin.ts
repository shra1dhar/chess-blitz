import { Noto_Serif_Display } from 'next/font/google';

// Latin only (basic ASCII - English, Indonesian, Malay, Tagalog)
export const notoSerifLatin = Noto_Serif_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
