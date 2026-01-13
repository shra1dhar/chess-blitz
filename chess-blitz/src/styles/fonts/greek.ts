import { Noto_Serif_Display } from 'next/font/google';

// Greek
export const notoSerifGreek = Noto_Serif_Display({
  subsets: ['greek', 'greek-ext'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
