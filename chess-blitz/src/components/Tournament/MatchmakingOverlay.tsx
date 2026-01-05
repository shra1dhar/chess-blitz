// ==============================================
// Chess Blitz - Matchmaking Overlay
// Premium chess-themed matchmaking experience
// Uses React Activity for state preservation
// ==============================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Activity } from 'react';
import { useActivityAnimation } from '@/hooks/useActivityAnimation';
import type { Color } from 'chess.js';
import type { MatchState, PlayerInfo } from '@/types/multiplayer';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './MatchmakingOverlay.module.scss';

interface MatchmakingOverlayProps {
  matchState: MatchState;
  queuePosition: number | null;
  opponent: PlayerInfo | null;
  playerColor: Color | null;
  onCancel: () => void;
  dict: Dictionary;
}

// Elegant knight SVG with detailed design
const KnightPiece = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 45 45"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
        fill="currentColor"
      />
      <path
        d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z"
        fill="var(--knight-eye, #1a1612)"
        stroke="var(--knight-eye, #1a1612)"
      />
      <path
        d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"
        fill="var(--knight-eye, #1a1612)"
        stroke="var(--knight-eye, #1a1612)"
        strokeWidth="1"
      />
    </g>
  </svg>
);

// Checkmark icon for match found state
const CheckmarkIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 13l4 4L19 7"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Crown icon for opponent display
const CrownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 3h14v2H5v-2z" />
  </svg>
);

export function MatchmakingOverlay({
  matchState,
  queuePosition,
  opponent,
  playerColor,
  onCancel,
  dict,
}: MatchmakingOverlayProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [ellipsis, setEllipsis] = useState('');

  const t = dict.tournament;

  // Overlay is visible when queued or matched (and not fading out)
  const isActive = matchState === 'queued' || matchState === 'matched';
  const { activityMode, hasBeenVisible } = useActivityAnimation({
    isVisible: isActive && !isFadingOut,
    animationDuration: 500, // Longer fade-out for this overlay
  });

  // Reset fading state when entering queue
  useEffect(() => {
    if (matchState === 'queued') {
      setIsFadingOut(false);
    }
  }, [matchState]);

  // Animate ellipsis for "Finding opponent..."
  useEffect(() => {
    if (matchState !== 'queued') return;

    const interval = setInterval(() => {
      setEllipsis((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, [matchState]);

  // Fade out when matched (after showing opponent info briefly)
  useEffect(() => {
    if (matchState === 'matched' && opponent) {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [matchState, opponent]);

  // Handle cancel with escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && matchState === 'queued') {
        onCancel();
      }
    },
    [matchState, onCancel]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Don't render anything until first shown
  if (!hasBeenVisible && !isActive) {
    return null;
  }

  const isMatched = matchState === 'matched';
  const showQueuePosition = queuePosition && queuePosition > 1 && !isMatched;

  return (
    <Activity mode={activityMode}>
      <div
        className={`${styles.overlay} ${isFadingOut ? styles.fadeOut : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={isMatched ? t.matchFound : t.findingOpponent}
      >
      {/* Decorative corner elements */}
      <div className={styles.cornerTL} aria-hidden="true" />
      <div className={styles.cornerTR} aria-hidden="true" />
      <div className={styles.cornerBL} aria-hidden="true" />
      <div className={styles.cornerBR} aria-hidden="true" />

      <div className={styles.content}>
        {/* Knight animation container */}
        <div className={`${styles.pieceContainer} ${isMatched ? styles.matched : ''}`}>
          <div className={styles.glowRing} aria-hidden="true" />
          <div className={styles.glowRingInner} aria-hidden="true" />

          {isMatched ? (
            <div className={styles.checkmarkWrapper}>
              <CheckmarkIcon className={styles.checkmark} />
            </div>
          ) : (
            <div className={styles.knightWrapper}>
              <KnightPiece className={styles.knight} />
            </div>
          )}
        </div>

        {/* Status text */}
        <div className={styles.statusSection}>
          {isMatched ? (
            <>
              <h2 className={styles.title}>{t.matchFound}</h2>
              {opponent && (
                <div className={styles.opponentInfo}>
                  <div className={styles.opponentCard}>
                    <CrownIcon className={styles.crownIcon} />
                    <span className={styles.opponentName}>{opponent.displayName}</span>
                    <span className={styles.opponentElo}>{opponent.elo}</span>
                  </div>
                  <p className={styles.colorAssignment}>
                    {playerColor === 'w' ? t.playingAsWhite : t.playingAsBlack}
                  </p>
                </div>
              )}
              <p className={styles.preparingText}>{t.preparingGame}</p>
            </>
          ) : (
            <>
              <h2 className={styles.title}>
                {t.findingOpponent}
                <span className={styles.ellipsis} aria-hidden="true">
                  {ellipsis}
                </span>
              </h2>

              {showQueuePosition && (
                <p className={styles.queuePosition}>
                  {t.position}: <span className={styles.positionNumber}>{queuePosition}</span>
                </p>
              )}

              <p className={styles.hint}>{t.matchmakingHint}</p>
            </>
          )}
        </div>

        {/* Cancel button - only shown when queued */}
        {matchState === 'queued' && (
          <button
            className={styles.cancelButton}
            onClick={onCancel}
            type="button"
          >
            <span className={styles.cancelText}>{t.cancel}</span>
            <span className={styles.escHint}>ESC</span>
          </button>
        )}
        </div>
      </div>
    </Activity>
  );
}

export default MatchmakingOverlay;
