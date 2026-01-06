'use client';

import { useState, useCallback } from 'react';
import { Activity } from 'react';
import type { Color } from 'chess.js';
import type { GameResult, GameStatus } from '@/types/chess';
import type { GameResultReason, EloChanges, TournamentType } from '@/types/multiplayer';
import type { Dictionary } from '@/i18n/dictionaries';
import type { RematchState } from '@/hooks/useMultiplayer';
import { TOURNAMENT_LABELS, TOURNAMENT_TIME_MS } from '@/types/multiplayer';
import styles from './GameOverModal.module.scss';

interface GameOverModalProps {
  result: GameResult;
  status: GameStatus;
  playerColor: Color;
  eloChanges?: EloChanges;
  tournamentType?: TournamentType;
  onPlayAgain: () => void; // Used for re-queue (New Game)
  onBackToLobby: () => void;
  dict: Dictionary;
  // Optional multiplayer rematch props
  isMultiplayer?: boolean;
  multiplayerReason?: GameResultReason;
  rematchState?: RematchState;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  // Dismiss functionality - allows user to view board after game ends
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

function DefeatIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={styles.iconSvg}>
      <path d="M32 16v32M16 32l16 16 16-16" stroke="#f44336" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DrawIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={styles.iconSvg}>
      <circle cx="32" cy="32" r="20" stroke="#b58863" strokeWidth="4" />
      <path d="M22 32h20" stroke="#b58863" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className={styles.spinnerIcon} viewBox="0 0 24 24" fill="none">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  rematchState = 'idle',
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  onDismiss,
}: GameOverModalProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const t = dict.tournament;

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleReopen = useCallback(() => {
    setIsDismissed(false);
  }, []);

  // Content Logic
  let title = '';
  let message = '';
  let IconComponent = VictoryIcon;
  let resultClass = '';

  if (multiplayerReason === 'abort') {
    title = 'Aborted';
    message = 'Game cancelled';
    IconComponent = DrawIcon;
    resultClass = styles.resultDraw;
  } else if (result === 'win') {
    title = 'You Won!';
    message = multiplayerReason === 'resignation' ? 'Opponent resigned' :
      multiplayerReason === 'timeout' ? 'You won on time' :
        'Checkmate!';
    IconComponent = VictoryIcon;
    resultClass = styles.resultWin;
  } else if (result === 'loss') {
    title = 'You Lost';
    message = multiplayerReason === 'timeout' ? 'Time ran out' :
      status === 'resigned' ? 'You resigned' : 'Checkmate';
    IconComponent = DefeatIcon;
    resultClass = styles.resultLoss;
  } else {
    title = 'Draw';
    message = multiplayerReason === 'stalemate' ? 'Stalemate' :
      multiplayerReason === 'insufficient_material' ? 'Insufficient material' :
        'Draw agreed';
    IconComponent = DrawIcon;
    resultClass = styles.resultDraw;
  }

  // Elo Calculation
  const whiteEloChange = eloChanges?.white || 0;
  const blackEloChange = eloChanges?.black || 0;
  const myEloChange = playerColor === 'w' ? whiteEloChange : blackEloChange;
  const oppEloChange = playerColor === 'w' ? blackEloChange : whiteEloChange;

  const renderEloChange = (change: number) => {
    if (change === 0) return <span className={`${styles.eloChange} ${styles.neutral}`}>-</span>;
    const isPositive = change > 0;
    return <span className={`${styles.eloChange} ${isPositive ? styles.positive : styles.negative}`}>{isPositive ? '+' : ''}{change}</span>;
  };

  return (
    <>
      <Activity mode={isDismissed ? 'hidden' : 'visible'}>
        <div className={styles.overlay}>
          <div className={`${styles.modal} ${resultClass}`}>
            <button className={styles.closeButton} onClick={onBackToLobby} aria-label="Back to home">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </button>

            <div className={styles.iconWrapper}>
              <IconComponent />
            </div>

            <h2 className={styles.title}>{title}</h2>
            <p className={styles.message}>{message}</p>

            {isMultiplayer && (
              <div className={styles.statsContainer}>
                <div className={styles.playerStat}>
                  <div className={styles.avatar}>{playerColor === 'w' ? '♔' : '♚'}</div>
                  <div className={styles.playerName}>You</div>
                  {renderEloChange(myEloChange)}
                </div>
                <div className={styles.playerStat}>
                  <div className={styles.avatar}>{playerColor === 'w' ? '♚' : '♔'}</div>
                  <div className={styles.playerName}>Opponent</div>
                  {renderEloChange(oppEloChange)}
                </div>
              </div>
            )}

            <div className={styles.actions}>
              {/* Primary: New Game */}
              <button className={`${styles.button} ${styles.buttonNewGame}`} onClick={onPlayAgain}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                New {getTimeLabel(tournamentType)}
              </button>

              {/* Secondary: Rematch */}
              {isMultiplayer && (
                <>
                  {rematchState === 'idle' && (
                    <button className={`${styles.button} ${styles.buttonRematch}`} onClick={onRequestRematch}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 14.5L16.5 16.5L15 18L13 16" /><path d="M9.5 14.5L7.5 16.5L9 18L11 16" /><path d="M4 4L16 16" /><path d="M20 4L8 16" /></svg>
                      Rematch
                    </button>
                  )}
                  {rematchState === 'requested' && <div className={styles.rematchPending}><SpinnerIcon /> Request Sent</div>}
                  {rematchState === 'received' && (
                    <div className={styles.rematchButtons}>
                      <button className={`${styles.button} ${styles.buttonNewGame}`} onClick={onAcceptRematch}>Accept Rematch</button>
                      <button className={`${styles.button} ${styles.buttonRematch}`} onClick={onDeclineRematch}>Decline</button>
                    </div>
                  )}
                </>
              )}

              {/* Tertiary: Review */}
              <button className={`${styles.button} ${styles.buttonReview}`} onClick={handleDismiss}>
                Game Review
              </button>
            </div>
          </div>
        </div>
      </Activity>

      <Activity mode={isDismissed ? 'visible' : 'hidden'}>
        <button className={styles.reopenButton} onClick={handleReopen}>
          <span>View Result</span>
        </button>
      </Activity>
    </>
  );
}

