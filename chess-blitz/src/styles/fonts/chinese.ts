import { Noto_Serif_SC } from 'next/font/google';

export const notoSerifSC = Noto_Serif_SC({
  preload: false,
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
