// ==============================================
// Chess Blitz - Multiplayer Game Page
// Dynamic route for multiplayer games after matchmaking
// ==============================================

import { Suspense } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { MultiplayerGameClient } from '@/components/play/MultiplayerGameClient';
import styles from '@/styles/play.module.scss';

interface PageProps {
  params: Promise<{ lang: Locale; gameId: string }>;
}

// Return one sample path for build-time validation
// Other game IDs will be generated dynamically at runtime
export function generateStaticParams() {
  return [{ lang: 'en', gameId: '_placeholder' }];
}

// Loading skeleton becomes part of the static shell
// Note: This renders BEFORE dictionary loads, so we use a spinner-only fallback
// The localized "Connecting to game..." message appears once MultiplayerGameClient mounts
function GameLoading() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingSpinner} />
      </div>
    </div>
  );
}

export default async function MultiplayerGamePage({ params }: PageProps) {
  const { lang, gameId } = await params;
  // Don't await - pass the promise to enable streaming
  const dictPromise = getDictionary(lang);

  return (
    <Suspense fallback={<GameLoading />}>
      <MultiplayerGameClient gameId={gameId} dictPromise={dictPromise} locale={lang} />
    </Suspense>
  );
}
