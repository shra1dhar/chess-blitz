import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://chess-blitz.zoony.io';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/play/*'], // Block API routes and dynamic game rooms
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
