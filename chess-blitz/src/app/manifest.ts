import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chess Blitz - Play Chess Online',
    short_name: 'Chess Blitz',
    description:
      'Play chess against AI with multiple difficulty levels. Free online chess game with classic Staunton pieces and beautiful board themes.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f6f3',
    theme_color: '#b58863',
    orientation: 'portrait',
    categories: ['games', 'entertainment'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
