// ==============================================
// Chess Blitz - Tournament Page (Localized)
// ==============================================

import { Suspense } from 'react';
import { TournamentLobby } from '@/components/Tournament';
import { getDictionary, type Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';

export const metadata = {
  title: 'Chess Arena - Chess Blitz',
  description: 'Join a tournament and play against opponents worldwide.',
};

// Loading skeleton for tournament lobby - this becomes part of the static shell
function TournamentLoading() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--color-background, #0a0a1a)'
    }}>
      <div style={{ textAlign: 'center', color: 'var(--color-text, #fff)' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>♔</div>
        <div>Loading...</div>
      </div>
    </div>
  );
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  // Don't await - pass the promise to client component for streaming
  const dictPromise = getDictionary(lang);

  return (
    <Suspense fallback={<TournamentLoading />}>
      <TournamentLobby dictPromise={dictPromise} />
    </Suspense>
  );
}
