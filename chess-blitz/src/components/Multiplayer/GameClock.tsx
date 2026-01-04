// ==============================================
// Chess Blitz - Game Clock Component
// Real-time countdown timer for multiplayer games
// ==============================================

'use client';

import { useState, useEffect, useRef } from 'react';
import type { Color } from 'chess.js';
import styles from './GameClock.module.scss';

interface GameClockProps {
  whiteTimeMs: number;
  blackTimeMs: number;
  turn: Color;
  isPlaying: boolean;
  lastMoveAt: number;
  playerColor: Color;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 10) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Show tenths when under 10 seconds
  if (totalSeconds < 10) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function GameClock({
  whiteTimeMs,
  blackTimeMs,
  turn,
  isPlaying,
  lastMoveAt,
  playerColor,
}: GameClockProps) {
  const [displayWhite, setDisplayWhite] = useState(whiteTimeMs);
  const [displayBlack, setDisplayBlack] = useState(blackTimeMs);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    setDisplayWhite(whiteTimeMs);
    setDisplayBlack(blackTimeMs);
  }, [whiteTimeMs, blackTimeMs]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const updateClock = () => {
      const now = Date.now();
      const elapsed = now - lastMoveAt;

      if (turn === 'w') {
        setDisplayWhite(Math.max(0, whiteTimeMs - elapsed));
      } else {
        setDisplayBlack(Math.max(0, blackTimeMs - elapsed));
      }

      animationRef.current = requestAnimationFrame(updateClock);
    };

    animationRef.current = requestAnimationFrame(updateClock);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, turn, whiteTimeMs, blackTimeMs, lastMoveAt]);

  const isWhiteLow = displayWhite < 30000; // Under 30 seconds
  const isBlackLow = displayBlack < 30000;
  const isWhiteCritical = displayWhite < 10000; // Under 10 seconds
  const isBlackCritical = displayBlack < 10000;

  // Determine which clock is on top based on player color
  const isPlayerWhite = playerColor === 'w';
  const topColor = isPlayerWhite ? 'b' : 'w';
  const bottomColor = isPlayerWhite ? 'w' : 'b';

  const renderClock = (color: Color) => {
    const time = color === 'w' ? displayWhite : displayBlack;
    const isActive = turn === color && isPlaying;
    const isLow = color === 'w' ? isWhiteLow : isBlackLow;
    const isCritical = color === 'w' ? isWhiteCritical : isBlackCritical;
    const label = color === 'w' ? 'White' : 'Black';

    return (
      <div
        className={`
          ${styles.clock}
          ${isActive ? styles.active : ''}
          ${isLow ? styles.low : ''}
          ${isCritical ? styles.critical : ''}
          ${color === 'w' ? styles.white : styles.black}
        `}
      >
        <span className={styles.label}>{label}</span>
        <span className={styles.time}>{formatTime(time)}</span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {renderClock(topColor)}
      {renderClock(bottomColor)}
    </div>
  );
}

export default GameClock;
