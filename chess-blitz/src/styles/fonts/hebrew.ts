import { Noto_Serif_Hebrew } from 'next/font/google';

export const notoSerifHebrew = Noto_Serif_Hebrew({
  subsets: ['hebrew'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
