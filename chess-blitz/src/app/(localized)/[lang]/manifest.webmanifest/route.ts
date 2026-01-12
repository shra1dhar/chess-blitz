import { getDictionary } from '@/i18n/dictionaries';
import { locales, type Locale } from '@/i18n/config';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lang: string }> }
) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  const manifest = {
    name: dict.meta.title,
    short_name: dict.appName,
    description: dict.meta.description,
    start_url: `/${lang}`,
    display: 'standalone',
    background_color: '#f8f6f3',
    theme_color: '#b58863',
    orientation: 'portrait',
    categories: ['games', 'entertainment'],
    id: 'chess-blitz-zoony',
    icons: [
      {
        src: '/chess-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/chess-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/chess-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/chess-icon-1920x1080.jpg',
        sizes: '1920x1080',
        type: 'image/jpg',
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}

// Generate static params for all locales
export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}
