import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import '../globals.scss';
import { AppInitializer } from '@/components/AppInitializer';
import { ToastProvider } from '@/components/Toast/ToastProvider';
import OfflineIndicator from '@/components/OfflineIndicator/OfflineIndicator';
import { JsonLd } from '@/components/JsonLd';
import { locales, isRtl, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getDisplayFont } from '@/styles/fonts';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://chess-blitz.zoony.io';

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

  // Generate hreflang alternates for all locales
  const languages: Record<Locale, string> = {} as Record<Locale, string>;
  for (const loc of locales) {
    languages[loc] = loc === 'en' ? BASE_URL : `${BASE_URL}/${loc}`;
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
      // English canonical is root URL, others include locale
      canonical: locale === 'en' ? BASE_URL : `${BASE_URL}/${locale}`,
      languages,
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: 'website',
      url: locale === 'en' ? BASE_URL : `${BASE_URL}/${locale}`,
      siteName: dict.appName,
      locale: locale,
      alternateLocale: locales.filter((l) => l !== locale),
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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  const dict = await getDictionary(locale);

  // Get the appropriate font for this locale
  const displayFont = getDisplayFont(locale);

  // English uses /manifest.webmanifest, other locales use /{lang}/manifest.webmanifest
  const manifestPath = locale === 'en' ? '/manifest.webmanifest' : `/${lang}/manifest.webmanifest`;

  return (
    <html lang={lang} dir={dir} data-theme="wood" className={displayFont.variable}>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href={manifestPath} />
        <JsonLd
          locale={locale}
          appName={dict.appName}
          description={dict.meta.description}
        />
      </head>
      <body>
        <AppInitializer />
        <OfflineIndicator />
        <div className="app-container">{children}</div>
        <ToastProvider />
      </body>
      <GoogleAnalytics gaId="G-GH8PBWTDSK" />
    </html>
  );
}
