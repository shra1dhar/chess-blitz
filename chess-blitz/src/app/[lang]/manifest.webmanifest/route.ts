import { getDictionary } from '@/i18n/dictionaries';
import { locales, type Locale } from '@/i18n/config';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lang: string }> }
) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);

  // English uses root path '/', other locales use '/{lang}'
  const startUrl = lang === 'en' ? '/' : `/${lang}`;
  const scope = lang === 'en' ? '/' : `/${lang}`;

  const manifest = {
    name: dict.meta.title,
    short_name: dict.appName,
    description: dict.meta.description,
    start_url: startUrl,
    scope: scope,
    lang: lang,
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
        src: '/screenshots/homepage-mobile-390x844.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Chess Blitz home screen',
      },
      {
        src: '/screenshots/game-setup-mobile-390x844.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Game setup screen',
      },
      {
        src: '/screenshots/game-play-mobile-390x844.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Chess game in progress',
      },
      {
        src: '/screenshots/tournament-mobile-390x844.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Tournament lobby',
      },
      {
        src: '/screenshots/homepage-desktop-1920x1080.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Chess Blitz home screen',
      },
      {
        src: '/screenshots/game-setup-desktop-1920x1080.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Game setup screen',
      },
      {
        src: '/screenshots/game-play-desktop-1920x1080.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Chess game in progress',
      },
      {
        src: '/screenshots/tournament-desktop-1920x1080.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Tournament lobby',
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
