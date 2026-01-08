'use client';

import { useState, useCallback } from 'react';
import { Activity } from 'react';
import type { Color } from 'chess.js';
import type { GameResult, GameStatus } from '@/types/chess';
import type { GameResultReason, EloChanges, TournamentType } from '@/types/multiplayer';
import type { Dictionary } from '@/i18n/dictionaries';
import { RematchState } from '@/hooks/useMultiplayer';
import { TOURNAMENT_TIME_MS } from '@/types/multiplayer';
import { Confetti } from '@/components/effects/Confetti';
import styles from './GameOverModal.module.scss';

interface GameOverModalProps {
  result: GameResult;
  status: GameStatus;
  playerColor: Color;
  eloChanges?: EloChanges;
  tournamentType?: TournamentType;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  dict: Dictionary;
  isMultiplayer?: boolean;
  multiplayerReason?: GameResultReason;
  rematchState?: RematchState;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  onDismiss?: () => void;
}

// Result Icons
function VictoryIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={styles.iconSvg}>
      <path d="M16 12h32v6c0 10-6 16-16 16s-16-6-16-16v-6z" fill="url(#gold)" stroke="#d4a534" strokeWidth="2" />
      <path d="M16 14c-6 0-8 4-8 8s2 8 8 8" stroke="#d4a534" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 14c6 0 8 4 8 8s-2 8-8 8" stroke="#d4a534" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 34v10M24 44h16v6h-16z" fill="#d4a534" />
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd700" /><stop offset="1" stopColor="#ffa500" /></linearGradient>
      </defs>
    </svg>
  );
}

// DefeatIcon - A tilted, falling king piece with detached crown
function DefeatIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.iconSvg}>
      <defs>
        <linearGradient id="defeatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c0392b" />
          <stop offset="100%" stopColor="#922b21" />
        </linearGradient>
        <linearGradient id="defeatShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#922b21" />
          <stop offset="100%" stopColor="#641e16" />
        </linearGradient>
      </defs>
      {/* Tilted king body */}
      <g transform="rotate(-15 32 32)">
        <ellipse cx="32" cy="52" rx="12" ry="4" fill="url(#defeatShadow)" />
        <path d="M26 48 L28 32 L36 32 L38 48 Z" fill="url(#defeatGradient)" />
        <circle cx="32" cy="28" r="8" fill="url(#defeatGradient)" />
      </g>
      {/* Fallen crown - separated and tumbling */}
      <g transform="translate(-4 -8) rotate(-35 24 16)">
        <path d="M16 20 L18 10 L22 16 L26 8 L30 16 L34 10 L36 20 Z" fill="url(#defeatGradient)" stroke="#922b21" strokeWidth="1" />
        <path d="M26 8 L26 4 M23 6 L29 6" stroke="url(#defeatGradient)" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* Motion lines */}
      <path d="M44 12 L48 8 M46 18 L52 14 M47 24 L52 22" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// DrawIcon - Two king silhouettes mirrored with balance symbol
function DrawIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.iconSvg}>
      <defs>
        <linearGradient id="drawGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a08060" />
          <stop offset="100%" stopColor="#8b7355" />
        </linearGradient>
        <linearGradient id="drawAccent" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c4a574" />
          <stop offset="100%" stopColor="#8b7355" />
        </linearGradient>
      </defs>
      {/* Left king */}
      <g transform="translate(4 8) scale(0.7)">
        <path d="M18 56 L16 52 L18 36 L14 36 L14 32 L18 32 L20 24 C20 20 24 16 28 16 C32 16 36 20 36 24 L38 32 L42 32 L42 36 L38 36 L40 52 L38 56 Z" fill="url(#drawGradient)" />
        <path d="M28 16 L28 8 M24 12 L32 12" stroke="url(#drawAccent)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* Right king - mirrored */}
      <g transform="translate(60 8) scale(-0.7 0.7)">
        <path d="M18 56 L16 52 L18 36 L14 36 L14 32 L18 32 L20 24 C20 20 24 16 28 16 C32 16 36 20 36 24 L38 32 L42 32 L42 36 L38 36 L40 52 L38 56 Z" fill="url(#drawGradient)" />
        <path d="M28 16 L28 8 M24 12 L32 12" stroke="url(#drawAccent)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* Equals sign */}
      <rect x="28" y="26" width="8" height="3" rx="1.5" fill="url(#drawAccent)" />
      <rect x="28" y="33" width="8" height="3" rx="1.5" fill="url(#drawAccent)" />
      {/* Balance beam */}
      <path d="M20 54 L44 54" stroke="url(#drawGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M32 54 L32 50" stroke="url(#drawGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

// AbortIcon - Chess board fragment with X overlay
function AbortIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.iconSvg}>
      <defs>
        <linearGradient id="abortGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7f8c8d" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
        <linearGradient id="abortDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5a6268" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
      </defs>
      {/* Mini chess board */}
      <g transform="translate(14 14)" opacity="0.7">
        <rect x="0" y="0" width="12" height="12" fill="#e5e7eb" rx="1" />
        <rect x="24" y="0" width="12" height="12" fill="#e5e7eb" rx="1" />
        <rect x="12" y="12" width="12" height="12" fill="#e5e7eb" rx="1" />
        <rect x="0" y="24" width="12" height="12" fill="#e5e7eb" rx="1" />
        <rect x="24" y="24" width="12" height="12" fill="#e5e7eb" rx="1" />
        <rect x="12" y="0" width="12" height="12" fill="url(#abortGradient)" rx="1" />
        <rect x="0" y="12" width="12" height="12" fill="url(#abortGradient)" rx="1" />
        <rect x="24" y="12" width="12" height="12" fill="url(#abortGradient)" rx="1" />
        <rect x="12" y="24" width="12" height="12" fill="url(#abortGradient)" rx="1" />
      </g>
      {/* X overlay */}
      <path d="M18 18 L46 46" stroke="url(#abortDark)" strokeWidth="6" strokeLinecap="round" />
      <path d="M46 18 L18 46" stroke="url(#abortDark)" strokeWidth="6" strokeLinecap="round" />
      <path d="M18 18 L46 46" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 18 L18 46" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#abortGradient)" strokeWidth="2" opacity="0.4" />
    </svg>
  );
}

// Helper to get time label (e.g. "3 min")
function getTimeLabel(type?: TournamentType): string {
  if (!type) return 'Game';
  const ms = TOURNAMENT_TIME_MS[type];
  const minutes = Math.floor(ms / 60000);
  return `${minutes} min`;
}

// Map multiplayer reasons to i18n keys
function getReasonKey(
  result: GameResult,
  status: GameStatus,
  multiplayerReason?: GameResultReason
): keyof Dictionary['gameResult']['reasons'] {
  if (multiplayerReason === 'abort') return 'gameCancelled';
  if (multiplayerReason === 'resignation') {
    return result === 'win' ? 'opponentResigned' : 'youResigned';
  }
  if (multiplayerReason === 'timeout') {
    return result === 'win' ? 'wonOnTime' : 'timeRanOut';
  }
  if (multiplayerReason === 'stalemate') return 'stalemate';
  if (multiplayerReason === 'insufficient_material') return 'insufficientMaterial';
  if (multiplayerReason === 'draw_agreement') return 'drawAgreed';
  if (multiplayerReason === 'fifty_move') return 'fiftyMoveRule';
  if (multiplayerReason === 'seventy_five_move') return 'seventyFiveMoveRule';
  if (multiplayerReason === 'threefold_repetition') return 'threefoldRepetition';
  if (multiplayerReason === 'fivefold_repetition') return 'fivefoldRepetition';
  if (multiplayerReason === 'timeout_vs_insufficient') return 'timeoutVsInsufficient';
  if (multiplayerReason === 'disconnect') return 'opponentDisconnected';
  if (multiplayerReason === 'no_show') return 'noShow';

  // Fallback for single player
  if (result === 'win') return 'checkmate';
  if (result === 'loss') {
    return status === 'resigned' ? 'youResigned' : 'checkmate';
  }
  return 'stalemate';
}

export default function GameOverModal({
  result,
  status,
  playerColor,
  eloChanges,
  tournamentType,
  onPlayAgain,
  onBackToLobby,
  dict,
  isMultiplayer = false,
  multiplayerReason,
  rematchState = RematchState.Idle,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  onDismiss,
}: GameOverModalProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const t = dict.gameResult;

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);


  // Determine result state
  const isAborted = multiplayerReason === 'abort';
  const isVictory = !isAborted && result === 'win';
  const isDefeat = !isAborted && result === 'loss';
  const isDraw = !isAborted && result === 'draw';

  // Get localized strings
  const title = isAborted ? t.titles.aborted :
    isVictory ? t.titles.victory :
    isDefeat ? t.titles.defeat :
    t.titles.draw;

  const reasonKey = getReasonKey(result, status, multiplayerReason);
  const message = t.reasons[reasonKey];

  // Determine icon and style class
  const IconComponent = isAborted ? AbortIcon :
    isVictory ? VictoryIcon :
    isDefeat ? DefeatIcon : DrawIcon;
  const resultClass = isAborted ? styles.resultAbort :
    isVictory ? styles.resultWin :
    isDefeat ? styles.resultLoss :
    styles.resultDraw;

  // Elo Calculation
  const myEloChange = playerColor === 'w' ? (eloChanges?.white || 0) : (eloChanges?.black || 0);

  const renderEloChange = (change: number) => {
    if (change === 0) return <span className={`${styles.eloChange} ${styles.neutral}`}>-</span>;
    const isPositive = change > 0;
    return (
      <span className={`${styles.eloChange} ${isPositive ? styles.positive : styles.negative}`}>
        {isPositive ? '+' : ''}{change}
      </span>
    );
  };

  // New game button text with time
  const timeLabel = getTimeLabel(tournamentType);
  const newGameText = t.actions.newGame.replace('{time}', timeLabel);

  return (
    <>
      {/* Confetti for victory */}
      <Confetti isActive={isVictory && !isDismissed} particleCount={50} />

      <Activity mode={isDismissed ? 'hidden' : 'visible'}>
        <div className={styles.overlay}>
          <div className={`${styles.modal} ${resultClass}`}>
            {/* Close button */}
            <button className={styles.closeButton} onClick={handleDismiss} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Accent bar at top */}
            <div className={styles.accentBar} />

            {/* Icon */}
            <div className={styles.iconWrapper}>
              <IconComponent />
            </div>

            {/* Title & Message */}
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.message}>{message}</p>

            {/* Elo Change Badge (multiplayer only) */}
            {isMultiplayer && myEloChange !== 0 && (
              <div className={styles.eloBadgeWrapper}>
                {renderEloChange(myEloChange)}
              </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              {/* Primary: New Game */}
              <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={onPlayAgain}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                {newGameText}
              </button>

              {/* Secondary: Rematch (multiplayer only) */}
              {isMultiplayer && (
                <>
                  {rematchState === RematchState.Idle && (
                    <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={onRequestRematch}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 3L21 7L17 11" />
                        <path d="M21 7H9C6.79086 7 5 8.79086 5 11V13" />
                        <path d="M7 21L3 17L7 13" />
                        <path d="M3 17H15C17.2091 17 19 15.2091 19 13V11" />
                      </svg>
                      {t.actions.rematch}
                    </button>
                  )}
                  {rematchState === RematchState.Requested && (
                    <div className={styles.rematchWaitingCard} aria-live="polite">
                      <span className={styles.waitingTitle}>{t.actions.requestSent}</span>
                      <span className={styles.waitingSubtitle}>
                        {dict.tournament.waitingForOpponent}
                        <span className={styles.waitingDots}>
                          <span className={styles.dot} />
                          <span className={styles.dot} />
                          <span className={styles.dot} />
                        </span>
                      </span>
                    </div>
                  )}
                  {rematchState === RematchState.Received && (
                    <div className={styles.rematchReceivedCard} aria-live="polite" role="alert">
                      <div className={styles.rematchNotification}>
                        <svg className={styles.notificationIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <span className={styles.notificationText}>{dict.tournament.rematchReceived}</span>
                      </div>
                      <div className={styles.rematchReceivedActions}>
                        <button className={`${styles.button} ${styles.buttonAcceptRematch}`} onClick={onAcceptRematch}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {t.actions.acceptRematch}
                        </button>
                        <button className={`${styles.button} ${styles.buttonDeclineRematch}`} onClick={onDeclineRematch}>
                          {t.actions.decline}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </Activity>
    </>
  );
}
