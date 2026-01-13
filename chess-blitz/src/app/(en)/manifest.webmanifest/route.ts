import { getDictionary } from '@/i18n/dictionaries';

export async function GET() {
  const dict = await getDictionary('en');

  const manifest = {
    name: `${dict.appName} - Play Chess Online`,
    short_name: dict.appName,
    description: dict.meta.description,
    start_url: '/',
    scope: '/',
    lang: 'en',
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
        type: 'image/jpeg',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/home-mobile.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Chess Blitz home screen',
      },
      {
        src: '/screenshots/game-mobile.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Chess game in progress',
      },
      {
        src: '/screenshots/home-desktop.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Chess Blitz home screen',
      },
      {
        src: '/screenshots/game-desktop.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Chess game in progress',
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
