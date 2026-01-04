'use client';

import type { Dictionary } from '@/i18n/dictionaries';
import styles from './GameControls.module.scss';

interface GameControlsProps {
  onUndo: () => void;
  onResign: () => void;
  onNewGame: () => void;
  canUndo: boolean;
  isGameOver: boolean;
  dict: Dictionary;
}

export default function GameControls({
  onUndo,
  onResign,
  onNewGame,
  canUndo,
  isGameOver,
  dict,
}: GameControlsProps) {
  return (
    <div className={styles.controls}>
      <h3 className={styles.title}>{dict.controls.controls}</h3>

      <div className={styles.buttonGroup}>
        {!isGameOver ? (
          <>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={onUndo}
              disabled={!canUndo}
              title={dict.controls.undoMove}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10h11a5 5 0 015 5v2M3 10l5-5M3 10l5 5" />
              </svg>
              <span>{dict.controls.undo}</span>
            </button>

            <button
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={onResign}
              title={dict.controls.resignGame}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l16 16M4 20L20 4" />
              </svg>
              <span>{dict.controls.resign}</span>
            </button>
          </>
        ) : (
          <button
            className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonFull}`}
            onClick={onNewGame}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
            <span>{dict.controls.playAgain}</span>
          </button>
        )}
      </div>

      {/* Hint button (for future rewarded ad integration) */}
      {!isGameOver && (
        <button
          className={`${styles.button} ${styles.buttonOutline} ${styles.buttonFull}`}
          disabled
          title={dict.controls.getHintSoon}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{dict.controls.getHint}</span>
        </button>
      )}
    </div>
  );
}
