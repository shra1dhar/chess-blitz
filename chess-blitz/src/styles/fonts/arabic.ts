import { Noto_Naskh_Arabic } from 'next/font/google';

export const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
