import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import '../globals.scss';
import { AppInitializer } from '@/components/AppInitializer';
import OfflineIndicator from '@/components/OfflineIndicator/OfflineIndicator';
import { JsonLd } from '@/components/JsonLd';
import { getDictionary } from '@/i18n/dictionaries';
import { locales, type Locale } from '@/i18n/config';
import { notoSerifDisplay } from '@/styles/fonts';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://chess-blitz.zoony.io';

// Generate metadata for English
export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary('en');

  // Generate hreflang alternates for all locales
  const languages: Record<Locale, string> = {} as Record<Locale, string>;
  for (const locale of locales) {
    languages[locale] = locale === 'en' ? BASE_URL : `${BASE_URL}/${locale}`;
  }

  return {
    metadataBase: new URL(BASE_URL),
    title: dict.meta.title,
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    authors: [{ name: dict.appName }],
    applicationName: dict.appName,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: dict.appName,
    },
    formatDetection: {
      telephone: false,
    },
    alternates: {
      canonical: BASE_URL,
      languages,
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: 'website',
      url: BASE_URL,
      siteName: dict.appName,
      locale: 'en',
      alternateLocale: locales.filter((l) => l !== 'en'),
      images: [
        {
          url: '/chess-icon-1920x1080.jpg',
          width: 1920,
          height: 1080,
          alt: dict.appName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.title,
      description: dict.meta.description,
      images: ['/chess-icon-1920x1080.jpg'],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function EnglishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dict = await getDictionary('en');

  return (
    <html lang="en" dir="ltr" data-theme="wood" className={notoSerifDisplay.variable}>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <JsonLd
          locale="en"
          appName={dict.appName}
          description={dict.meta.description}
        />
      </head>
      <body>
        <AppInitializer />
        <OfflineIndicator />
        <div className="app-container">{children}</div>
      </body>
      <GoogleAnalytics gaId="G-GH8PBWTDSK" />
    </html>
  );
}
