import type { MetadataRoute } from 'next';
import { locales, defaultLocale, type Locale } from '@/i18n/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://chess-blitz.zoony.io';

  // Static pages that exist for each locale
  const staticPages = ['', '/tournament', '/play', '/privacy'];

  // Generate hreflang alternates for all locales
  const generateAlternates = (path: string) => {
    const languages: Record<Locale, string> = {} as Record<Locale, string>;
    for (const locale of locales) {
      const localePath =
        locale === defaultLocale ? path : `/${locale}${path}`;
      languages[locale] = `${baseUrl}${localePath || '/'}`;
    }
    return { languages };
  };

  const entries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    // English (root) version
    entries.push({
      url: `${baseUrl}${page || '/'}`,
      lastModified: new Date(),
      changeFrequency: page === '' ? 'daily' : 'weekly',
      priority: page === '' ? 1.0 : 0.8,
      alternates: generateAlternates(page),
    });

    // Localized versions (except English which uses root)
    for (const locale of locales) {
      if (locale === defaultLocale) continue;
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : 0.8,
        alternates: generateAlternates(page),
      });
    }
  }

  return entries;
}
