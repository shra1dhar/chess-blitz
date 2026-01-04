'use client';

import { useState, useCallback } from 'react';
import type { Color } from 'chess.js';
import type { GameResult, GameStatus } from '@/types/chess';
import type { GameResultReason } from '@/types/multiplayer';
import type { Dictionary } from '@/i18n/dictionaries';
import type { RematchState } from '@/hooks/useMultiplayer';
import styles from './GameOverModal.module.scss';

interface GameOverModalProps {
  result: GameResult;
  status: GameStatus;
  playerColor: Color;
  onPlayAgain: () => void;
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

// Victory trophy icon with crown accent
function VictoryIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.iconSvg}>
      <defs>
        <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f4d03f" />
          <stop offset="50%" stopColor="#d4a534" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
        <linearGradient id="trophyShine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fff8dc" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#fff8dc" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Trophy cup */}
      <path
        d="M20 12h24v4c0 8-4 14-12 16-8-2-12-8-12-16v-4z"
        fill="url(#trophyGold)"
        stroke="#8b6914"
        strokeWidth="1.5"
      />
      {/* Handles */}
      <path
        d="M20 14c-4 0-6 2-6 6s2 6 6 6"
        fill="none"
        stroke="url(#trophyGold)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M44 14c4 0 6 2 6 6s-2 6-6 6"
        fill="none"
        stroke="url(#trophyGold)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Stem and base */}
      <path d="M28 32h8v6h-8z" fill="url(#trophyGold)" stroke="#8b6914" strokeWidth="1" />
      <path d="M24 38h16v4H24z" fill="url(#trophyGold)" stroke="#8b6914" strokeWidth="1" />
      <rect x="22" y="42" width="20" height="6" rx="1" fill="url(#trophyGold)" stroke="#8b6914" strokeWidth="1" />
      {/* Crown accent on top */}
      <path
        d="M26 10l2-4 4 2 4-2 2 4"
        fill="none"
        stroke="#d4a534"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Shine */}
      <path d="M24 14v8" stroke="url(#trophyShine)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Defeat icon - fallen king piece
function DefeatIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.iconSvg}>
      {/* Fallen king piece, tilted */}
      <g transform="rotate(-30 32 32)">
        {/* Base */}
        <ellipse cx="32" cy="52" rx="12" ry="4" fill="#4a4a4a" />
        <path d="M20 48h24v4c0 2-5 4-12 4s-12-2-12-4v-4z" fill="#5a5a5a" stroke="#3a3a3a" strokeWidth="1" />
        {/* Body */}
        <path
          d="M24 48c0-8 2-16 8-22 6 6 8 14 8 22H24z"
          fill="#5a5a5a"
          stroke="#3a3a3a"
          strokeWidth="1.5"
        />
        {/* Cross on top */}
        <rect x="30" y="18" width="4" height="12" rx="1" fill="#5a5a5a" stroke="#3a3a3a" strokeWidth="1" />
        <rect x="26" y="22" width="12" height="4" rx="1" fill="#5a5a5a" stroke="#3a3a3a" strokeWidth="1" />
        {/* Crown details */}
        <circle cx="32" cy="16" r="3" fill="#5a5a5a" stroke="#3a3a3a" strokeWidth="1" />
      </g>
      {/* X mark overlay */}
      <g opacity="0.6">
        <path d="M18 18l28 28" stroke="#8b0000" strokeWidth="4" strokeLinecap="round" />
        <path d="M46 18L18 46" stroke="#8b0000" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// Resigned icon - white flag
function ResignedIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.iconSvg}>
      {/* Flag pole */}
      <line x1="20" y1="12" x2="20" y2="54" stroke="#6b5b4f" strokeWidth="3" strokeLinecap="round" />
      {/* Pole base */}
      <ellipse cx="20" cy="54" rx="6" ry="2" fill="#5a4a3f" />
      {/* White flag with wave */}
      <path
        d="M20 12c4 0 8 2 14 2s10-2 14-2v20c-4 0-8 2-14 2s-10-2-14-2V12z"
        fill="#f5f5f5"
        stroke="#d0d0d0"
        strokeWidth="1.5"
      />
      {/* Flag wave lines */}
      <path d="M24 18c4 1 8 1 12 0" stroke="#e0e0e0" strokeWidth="1" fill="none" />
      <path d="M24 24c4 1 8 1 12 0" stroke="#e0e0e0" strokeWidth="1" fill="none" />
      {/* Subtle shadow */}
      <path d="M20 32c4 0 8 2 14 2s10-2 14-2" stroke="#c0c0c0" strokeWidth="0.5" fill="none" />
    </svg>
  );
}

// Draw icon - balanced scales / handshake
function DrawIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.iconSvg}>
      {/* Two hands meeting in handshake */}
      {/* Left hand */}
      <path
        d="M12 32c2-2 6-4 10-4h6l4 4-4 8h-6c-4 0-8-2-10-4v-4z"
        fill="#d4a574"
        stroke="#8b6914"
        strokeWidth="1.5"
      />
      {/* Right hand */}
      <path
        d="M52 32c-2-2-6-4-10-4h-6l-4 4 4 8h6c4 0 8-2 10-4v-4z"
        fill="#c49664"
        stroke="#8b6914"
        strokeWidth="1.5"
      />
      {/* Clasped fingers */}
      <path
        d="M28 32h8"
        stroke="#8b6914"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M26 36h12"
        stroke="#8b6914"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Equals sign above */}
      <rect x="24" y="16" width="16" height="3" rx="1" fill="#769656" />
      <rect x="24" y="22" width="16" height="3" rx="1" fill="#769656" />
    </svg>
  );
}

// Rematch spinner icon
function SpinnerIcon() {
  return (
    <svg className={styles.spinnerIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Crossed swords icon for rematch - represents battle/competition
function RematchIcon() {
  return (
    <svg className={styles.rematchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left sword */}
      <path
        d="M4 4l12 12M4 4v4M4 4h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 14.5l2 2-1.5 1.5-2-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right sword */}
      <path
        d="M20 4L8 16M20 4v4M20 4h-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 14.5l-2 2 1.5 1.5 2-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Helper function to get message for multiplayer result reasons
function getMultiplayerReasonMessage(reason: GameResultReason | undefined): string | null {
  switch (reason) {
    case 'abort':
      return 'Game aborted';
    case 'timeout_vs_insufficient':
      return 'Draw - Timeout with insufficient material';
    case 'seventy_five_move':
      return 'Draw - 75-move rule';
    case 'fivefold_repetition':
      return 'Draw - Fivefold repetition';
    case 'disconnect':
      return 'Opponent disconnected';
    case 'timeout':
      return 'Time ran out';
    default:
      return null;
  }
}

export default function GameOverModal({
  result,
  status,
  playerColor,
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

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // Only dismiss if clicking directly on the overlay (not the modal content)
    if (e.target === e.currentTarget) {
      handleDismiss();
    }
  }, [handleDismiss]);
  // Determine title, message, and icon component
  let title = '';
  let message = '';
  let IconComponent: React.FC = VictoryIcon;
  let resultClass = '';

  // Special handling for aborted games
  if (multiplayerReason === 'abort') {
    title = 'Game Aborted';
    message = 'The game was cancelled before any moves were made';
    IconComponent = DrawIcon;
    resultClass = styles.resultDraw;
  } else if (result === 'win') {
    title = dict.gameOver.victory;
    message = status === 'checkmate' ? dict.gameOver.wonByCheckmate : dict.gameOver.youWon;
    // Add multiplayer-specific win messages
    if (multiplayerReason === 'timeout') {
      message = 'Opponent ran out of time';
    } else if (multiplayerReason === 'disconnect') {
      message = 'Opponent disconnected';
    } else if (multiplayerReason === 'resignation') {
      message = 'Opponent resigned';
    }
    IconComponent = VictoryIcon;
    resultClass = styles.resultWin;
  } else if (result === 'loss') {
    title = status === 'resigned' ? dict.gameOver.youResigned : dict.gameOver.defeat;
    message = status === 'checkmate' ? dict.gameOver.checkmateDefeat : dict.gameOver.gameOver;
    // Add multiplayer-specific loss messages
    if (multiplayerReason === 'timeout') {
      message = 'You ran out of time';
    }
    IconComponent = status === 'resigned' ? ResignedIcon : DefeatIcon;
    resultClass = styles.resultLoss;
  } else if (result === 'draw') {
    title = dict.gameOver.draw;
    // Check for multiplayer draw reasons first
    const mpReasonMsg = getMultiplayerReasonMessage(multiplayerReason);
    if (mpReasonMsg) {
      message = mpReasonMsg;
    } else if (status === 'stalemate') {
      message = dict.gameOver.stalemateEnd;
    } else {
      message = dict.gameOver.drawEnd;
    }
    IconComponent = DrawIcon;
    resultClass = styles.resultDraw;
  }

  // Show floating reopen button when modal is dismissed
  if (isDismissed) {
    return (
      <button
        className={styles.reopenButton}
        onClick={handleReopen}
        type="button"
        aria-label="View game result"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>View Result</span>
      </button>
    );
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={`${styles.modal} ${resultClass}`}>
        {/* Close button - allows dismissing to view the board */}
        <button
          className={styles.closeButton}
          onClick={handleDismiss}
          type="button"
          aria-label="Close and view board"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.iconWrapper}>
          <IconComponent />
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{dict.gameOver.playedAs}</span>
            <span className={styles.statValue}>
              <span className={playerColor === 'w' ? styles.pieceWhite : styles.pieceBlack} />
              {playerColor === 'w' ? dict.gameOptions.white : dict.gameOptions.black}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{dict.gameOver.result}</span>
            <span className={`${styles.statValue} ${styles[`result${result?.charAt(0).toUpperCase()}${result?.slice(1)}Text`]}`}>
              {result === 'win' ? dict.gameOver.win : result === 'loss' ? dict.gameOver.loss : dict.gameOver.draw}
            </span>
          </div>
        </div>

        {/* Rematch section - only shown for multiplayer games */}
        {isMultiplayer && (
          <div className={styles.rematchSection}>
            {rematchState === 'received' ? (
              <>
                <p className={styles.rematchText}>{t.rematchReceived}</p>
                <div className={styles.rematchButtons}>
                  <button
                    className={`${styles.button} ${styles.buttonRematchAccept}`}
                    onClick={onAcceptRematch}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t.accept}
                  </button>
                  <button
                    className={`${styles.button} ${styles.buttonRematchDecline}`}
                    onClick={onDeclineRematch}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    {t.decline}
                  </button>
                </div>
              </>
            ) : rematchState === 'requested' ? (
              <div className={styles.rematchPending}>
                <SpinnerIcon />
                <span>{t.waitingForOpponent}</span>
              </div>
            ) : rematchState === 'accepted' ? (
              <div className={styles.rematchAccepted}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{t.rematchAccepted}</span>
              </div>
            ) : (
              <button
                className={`${styles.button} ${styles.buttonRematch}`}
                onClick={onRequestRematch}
              >
                <RematchIcon />
                {t.rematchRequest}
              </button>
            )}
          </div>
        )}

        <div className={styles.actions}>
          {!isMultiplayer && (
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={onPlayAgain}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
              </svg>
              {dict.gameOver.playAgain}
            </button>
          )}
          <button
            className={`${styles.button} ${isMultiplayer ? styles.buttonPrimary : styles.buttonSecondary}`}
            onClick={onBackToLobby}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {dict.gameOver.backToMenu}
          </button>
        </div>
      </div>
    </div>
  );
}
