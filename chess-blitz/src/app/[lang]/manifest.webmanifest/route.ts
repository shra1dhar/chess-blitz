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

  const manifest = {
    name: dict.meta.title,
    short_name: dict.appName,
    description: dict.meta.description,
    start_url: startUrl,
    display: 'standalone',
    background_color: '#f8f6f3',
    theme_color: '#b58863',
    id: '',
    dir: 'auto',
    orientation: 'portrait',
    ms_start_compatible: true,
    categories: ['games'],
    launch_handler: {
      client_mode: 'auto',
    },
    _msstart: {
      leaderboards: {
        default: {
          score_type: 'Numeric',
          score_order_by: 'Desc',
          score_decimal_places: '0',
          show_total_players: 'true',
          enabled: 'true',
        },
      },
    },
    icons: [
      {
        src: '/chess-blitz-purple-192x192.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/chess-blitz-purple-512x512.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
      {
        src: '/chess-blitz-purple-1920x1080.jpg',
        sizes: '1920x1080',
        type: 'image/jpeg',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/homepage-mobile-390x844.png',
        sizes: '390x844',
        type: 'image/png',
        platform: 'narrow',
        label: 'Chess Blitz home screen',
      },
      {
        src: '/screenshots/game-setup-mobile-390x844.png',
        sizes: '390x844',
        type: 'image/png',
        platform: 'narrow',
        label: 'Game setup screen',
      },
      {
        src: '/screenshots/game-play-mobile-390x844.png',
        sizes: '390x844',
        type: 'image/png',
        platform: 'narrow',
        label: 'Chess game in progress',
      },
      {
        src: '/screenshots/tournament-mobile-390x844.png',
        sizes: '390x844',
        type: 'image/png',
        platform: 'narrow',
        label: 'Tournament lobby',
      },
      {
        src: '/screenshots/homepage-desktop-1920x1080.png',
        sizes: '1920x1080',
        type: 'image/png',
        platform: 'wide',
        label: 'Chess Blitz home screen',
      },
      {
        src: '/screenshots/game-setup-desktop-1920x1080.png',
        sizes: '1920x1080',
        type: 'image/png',
        platform: 'wide',
        label: 'Game setup screen',
      },
      {
        src: '/screenshots/game-play-desktop-1920x1080.png',
        sizes: '1920x1080',
        type: 'image/png',
        platform: 'wide',
        label: 'Chess game in progress',
      },
      {
        src: '/screenshots/tournament-desktop-1920x1080.png',
        sizes: '1920x1080',
        type: 'image/png',
        platform: 'wide',
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
