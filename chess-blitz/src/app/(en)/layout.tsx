import type { Metadata, Viewport } from 'next';
import '../globals.scss';
import { AppInitializer } from '@/components/AppInitializer';
import { getDictionary } from '@/i18n/dictionaries';

// Generate metadata for English
export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary('en');

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    authors: [{ name: 'Chess Blitz' }],
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: 'website',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function EnglishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" data-theme="wood">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <AppInitializer />
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
