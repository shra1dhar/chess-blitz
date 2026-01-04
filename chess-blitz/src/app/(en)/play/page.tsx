// ==============================================
// Chess Blitz - Play Page (English - Root)
// ==============================================

import { Suspense } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import { GameClient } from '@/components/play/GameClient';
import styles from '@/styles/play.module.scss';

function GameLoading() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading game...</p>
      </div>
    </div>
  );
}

export default async function PlayPage() {
  // Don't await - pass the promise to enable streaming
  const dictPromise = getDictionary('en');

  return (
    <Suspense fallback={<GameLoading />}>
      <GameClient dictPromise={dictPromise} locale="en" />
    </Suspense>
  );
}
