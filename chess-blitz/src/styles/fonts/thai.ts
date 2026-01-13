import { Noto_Serif_Thai } from 'next/font/google';

export const notoSerifThai = Noto_Serif_Thai({
  subsets: ['thai'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
