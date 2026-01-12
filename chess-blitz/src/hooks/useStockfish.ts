// ==============================================
// Chess Blitz - Stockfish AI Hook
// Uses singleton service for shared Worker instance
// ==============================================

import { useCallback, useEffect, useRef, useState, useEffectEvent } from 'react';
import type { Difficulty } from '@/types/chess';
import { DIFFICULTY_CONFIGS } from '@/types/chess';
import {
  initStockfish,
  setSkillLevel,
  findBestMove as sfFindBestMove,
  stopCalculation,
  getStatus,
  type EngineVersion,
} from '@/services/stockfishService';

interface UseStockfishOptions {
  difficulty: Difficulty;
  onBestMove: (move: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean; // Only initialize when true (default: true)
}

interface UseStockfishReturn {
  isReady: boolean;
  isThinking: boolean;
  engineVersion: EngineVersion;
  findBestMove: (fen: string) => void;
  stop: () => void;
}

export function useStockfish({
  difficulty,
  onBestMove,
  onError,
  enabled = true,
}: UseStockfishOptions): UseStockfishReturn {
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [engineVersion, setEngineVersion] = useState<EngineVersion>(null);
  const pendingMoveRef = useRef<string | null>(null);
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callbacks via useEffectEvent
  const onBestMoveEvent = useEffectEvent((move: string) => onBestMove(move));
  const onErrorEvent = useEffectEvent((error: string) => onError?.(error));

  // Initialize singleton when enabled
  useEffect(() => {
    if (!enabled) return;

    // Check if already ready (singleton may have been initialized by another hook)
    const status = getStatus();
    if (status.isReady) {
      setIsReady(true);
      setEngineVersion(status.engineVersion);
      return;
    }

    // Initialize the singleton
    initStockfish()
      .then((version) => {
        setIsReady(true);
        setEngineVersion(version);
      })
      .catch((error) => {
        console.error('[useStockfish] Init failed:', error);
        onErrorEvent('Failed to initialize chess engine');
      });
  }, [enabled]);

  // Update skill level when difficulty changes
  useEffect(() => {
    if (isReady) {
      const config = DIFFICULTY_CONFIGS[difficulty];
      setSkillLevel(config.skillLevel);
    }
  }, [difficulty, isReady]);

  // Find best move
  const findBestMove = useCallback(
    (fen: string) => {
      if (!isReady) {
        console.warn('[useStockfish] Not ready');
        return;
      }

      setIsThinking(true);
      pendingMoveRef.current = null;

      const config = DIFFICULTY_CONFIGS[difficulty];

      // Request move from singleton service
      sfFindBestMove(fen, config.depth, (move) => {
        pendingMoveRef.current = move;
      });

      // Wait for thinkingTime, then deliver move (or wait up to 10s if not ready)
      thinkingTimeoutRef.current = setTimeout(() => {
        const deliverMove = () => {
          const move = pendingMoveRef.current;
          pendingMoveRef.current = null;
          setIsThinking(false);
          if (move) onBestMoveEvent(move);
        };

        if (pendingMoveRef.current) {
          deliverMove();
        } else {
          // Poll briefly if move not ready yet (max 10s)
          let waited = 0;
          const poll = setInterval(() => {
            waited += 100;
            if (pendingMoveRef.current) {
              clearInterval(poll);
              deliverMove();
            } else if (waited >= 10000) {
              clearInterval(poll);
              setIsThinking(false);
              onErrorEvent('Engine timeout - please try again');
            }
          }, 100);
        }
      }, config.thinkingTime);
    },
    [difficulty, isReady]
  );

  // Stop calculation
  const stop = useCallback(() => {
    stopCalculation();
    if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
    setIsThinking(false);
    pendingMoveRef.current = null;
  }, []);

  return { isReady, isThinking, engineVersion, findBestMove, stop };
}

// Parse UCI move format (e.g., "e2e4" or "e7e8q" for promotion)
export function parseUCIMove(uciMove: string): { from: string; to: string; promotion?: string } {
  return {
    from: uciMove.slice(0, 2),
    to: uciMove.slice(2, 4),
    promotion: uciMove.length > 4 ? uciMove[4] : undefined,
  };
}
