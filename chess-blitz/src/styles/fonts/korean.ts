import { Noto_Serif_KR } from 'next/font/google';

export const notoSerifKR = Noto_Serif_KR({
  preload: false,
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
