import { getDictionary } from '@/i18n/dictionaries';

export async function GET() {
  const dict = await getDictionary('en');

  const manifest = {
    name: `${dict.appName} - Play Chess Online`,
    short_name: dict.appName,
    description: dict.meta.description,
    start_url: '/',
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
