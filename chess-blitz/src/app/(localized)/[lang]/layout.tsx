import type { Metadata, Viewport } from 'next';
import '../../globals.scss';
import { AppInitializer } from '@/components/AppInitializer';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import { locales, isRtl, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

// Generate static params for all locales
export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// Generate metadata based on locale
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    authors: [{ name: 'Chess Blitz' }],
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: 'website',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dir = isRtl(lang as Locale) ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir} data-theme="wood">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <AppInitializer />
        <div className="app-container">
          {children}
        </div>
        <ToastProvider />
      </body>
    </html>
  );
}
