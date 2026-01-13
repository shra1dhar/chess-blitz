import { Noto_Serif_JP } from 'next/font/google';

export const notoSerifJP = Noto_Serif_JP({
  preload: false,
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
