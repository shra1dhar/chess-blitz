// ==============================================
// Chess Blitz - Play Page (Server Component Wrapper)
// ==============================================

import { Suspense } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { GameClient } from '@/components/play/GameClient';
import styles from '@/styles/play.module.scss';

// Loading skeleton becomes part of the static shell
function PlayLoading() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading game...</p>
      </div>
    </div>
  );
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  // Don't await - pass the promise to enable streaming
  const dictPromise = getDictionary(lang);

  return (
    <Suspense fallback={<PlayLoading />}>
      <GameClient dictPromise={dictPromise} locale={lang} />
    </Suspense>
  );
}
