// ==============================================
// Chess Blitz - Game Clock Hook
// Real-time clock countdown with requestAnimationFrame
// ==============================================

import { useEffect, useRef, useState } from 'react';

interface UseGameClockOptions {
  whiteTimeMs: number;
  blackTimeMs: number;
  turn: 'w' | 'b';
  lastMoveAt: number;
  isPlaying: boolean;
}

interface ClockTimes {
  white: number;
  black: number;
}

/**
 * Hook that provides real-time clock countdown display values.
 * Uses refs to store server times to avoid re-triggering the animation loop.
 * The animation loop only depends on isPlaying state.
 */
export function useGameClock(options: UseGameClockOptions): ClockTimes {
  const { whiteTimeMs, blackTimeMs, turn, lastMoveAt, isPlaying } = options;

  // Use refs to store server times - updating these won't restart the animation loop
  const serverTimesRef = useRef({
    white: whiteTimeMs,
    black: blackTimeMs,
    lastMoveAt,
    turn,
  });

  // Display times state - what gets rendered
  const [displayTimes, setDisplayTimes] = useState<ClockTimes>({
    white: whiteTimeMs,
    black: blackTimeMs,
  });

  // Animation frame ref
  const animationRef = useRef<number | null>(null);

  // Update refs when server sends new times (doesn't trigger animation restart)
  useEffect(() => {
    serverTimesRef.current = {
      white: whiteTimeMs,
      black: blackTimeMs,
      lastMoveAt,
      turn,
    };
    // Also update display times for initial render and server corrections
    setDisplayTimes({ white: whiteTimeMs, black: blackTimeMs });
  }, [whiteTimeMs, blackTimeMs, lastMoveAt, turn]);

  // Real-time clock countdown - only depends on isPlaying
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const updateClock = () => {
      const { white, black, lastMoveAt: lastMove, turn: currentTurn } = serverTimesRef.current;
      const elapsed = Date.now() - lastMove;

      if (currentTurn === 'w') {
        setDisplayTimes({
          white: Math.max(0, white - elapsed),
          black,
        });
      } else {
        setDisplayTimes({
          white,
          black: Math.max(0, black - elapsed),
        });
      }

      animationRef.current = requestAnimationFrame(updateClock);
    };

    animationRef.current = requestAnimationFrame(updateClock);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]); // Only re-run when game starts/stops

  return displayTimes;
}
