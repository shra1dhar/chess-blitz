import { Noto_Serif_Bengali } from 'next/font/google';

export const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
