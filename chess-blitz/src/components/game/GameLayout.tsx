'use client';

// ==============================================
// Chess Blitz - Game Layout Component
// Composition-based layout for game pages
// ==============================================

import type { ReactNode } from 'react';
import { BackArrowIcon } from '@/components/icons';
import styles from '@/styles/play.module.scss';

interface FloatingBackButtonProps {
  label: string;
  onBack: () => void;
}

interface GameLayoutProps {
  theme: string;
  header?: ReactNode;
  floatingBackButton?: FloatingBackButtonProps;
  opponentInfo: ReactNode;
  board: ReactNode;
  playerInfo: ReactNode;
  mobileControls?: ReactNode;
  sidebar?: ReactNode;
  overlays?: ReactNode;
}

export function GameLayout({
  theme,
  header,
  floatingBackButton,
  opponentInfo,
  board,
  playerInfo,
  mobileControls,
  sidebar,
  overlays,
}: GameLayoutProps) {
  return (
    <div className={styles.game} data-theme={theme}>
      {header}

      {/* Floating back button - shown when no header */}
      {floatingBackButton && (
        <button className={styles.floatingBackButton} onClick={floatingBackButton.onBack}>
          <BackArrowIcon />
          <span>{floatingBackButton.label}</span>
        </button>
      )}

      <main className={styles.main}>
        <div className={styles.gameLayout}>
          {/* Board section */}
          <div className={styles.boardSection}>
            {opponentInfo}
            {board}
            {playerInfo}

            {/* Mobile Controls - shown below board on mobile */}
            {mobileControls && <div className={styles.mobileControls}>{mobileControls}</div>}
          </div>

          {/* Sidebar - hidden on mobile and tablet */}
          {sidebar && <aside className={styles.sidebar}>{sidebar}</aside>}
        </div>
      </main>

      {/* Overlays (modals, banners, etc.) */}
      {overlays}
    </div>
  );
}
