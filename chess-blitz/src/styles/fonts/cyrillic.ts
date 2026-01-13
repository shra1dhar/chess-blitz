import { Noto_Serif_Display } from 'next/font/google';

// Cyrillic (Russian, Ukrainian, Bulgarian, Serbian)
export const notoSerifCyrillic = Noto_Serif_Display({
  subsets: ['cyrillic', 'cyrillic-ext'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
