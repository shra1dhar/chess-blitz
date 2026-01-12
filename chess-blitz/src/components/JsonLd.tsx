import { locales, type Locale } from '@/i18n/config';

interface JsonLdProps {
  locale?: Locale;
  appName: string;
  description: string;
}

export function JsonLd({
  locale = 'en',
  appName,
  description,
}: JsonLdProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://chess-blitz.zoony.io';
  const url = locale === 'en' ? baseUrl : `${baseUrl}/${locale}`;

  // VideoGame schema (best fit for a chess game application)
  const gameSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: appName,
    description: description,
    url: url,
    image: [
      `${baseUrl}/chess-icon-512.png`,
      `${baseUrl}/chess-icon-1920x1080.jpg`,
    ],
    screenshot: `${baseUrl}/chess-icon-1920x1080.jpg`,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web Browser',
    gamePlatform: ['Web Browser', 'iOS', 'Android'],
    genre: ['Strategy', 'Board Game', 'Chess'],
    playMode: ['SinglePlayer', 'MultiPlayer'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    inLanguage: locales,
    author: {
      '@type': 'Organization',
      name: 'Zoony',
      url: 'https://zoony.io',
    },
  };

  // WebSite schema for sitelinks search
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: appName,
    url: baseUrl,
    inLanguage: locales,
  };

  const jsonLd = [gameSchema, websiteSchema];

  // Note: dangerouslySetInnerHTML is the recommended pattern for JSON-LD per Next.js docs
  // XSS protection via .replace(/</g, '\\u003c') as recommended
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}
