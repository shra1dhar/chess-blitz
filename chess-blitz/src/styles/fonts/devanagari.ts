import { Noto_Serif_Devanagari } from 'next/font/google';

export const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
