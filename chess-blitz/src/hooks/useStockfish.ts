// ==============================================
// Chess Blitz - Stockfish AI Hook
// ==============================================

import { useCallback, useEffect, useRef, useState, useEffectEvent } from 'react';
import type { Difficulty } from '@/types/chess';
import { DIFFICULTY_CONFIGS } from '@/types/chess';

interface UseStockfishOptions {
  difficulty: Difficulty;
  onBestMove: (move: string) => void;
  onError?: (error: string) => void;
}

interface UseStockfishReturn {
  isReady: boolean;
  isThinking: boolean;
  findBestMove: (fen: string) => void;
  stop: () => void;
}

// Stockfish.js CDN URL (lightweight version)
const STOCKFISH_URL = 'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';

export function useStockfish({
  difficulty,
  onBestMove,
  onError,
}: UseStockfishOptions): UseStockfishReturn {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const pendingMoveRef = useRef<string | null>(null);
  const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use useEffectEvent to access latest callbacks without triggering Effect re-runs
  const onBestMoveEvent = useEffectEvent((move: string) => {
    onBestMove(move);
  });

  const onErrorEvent = useEffectEvent((error: string) => {
    onError?.(error);
  });

  // Initialize Stockfish worker
  useEffect(() => {
    let mounted = true;

    // Reset ready state on mount
    setIsReady(false);

    const initWorker = async () => {
      try {
        // Create a blob URL for the worker
        const response = await fetch(STOCKFISH_URL);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const worker = new Worker(url);

        worker.onmessage = (event) => {
          const message = event.data;

          if (typeof message === 'string') {
            // Debug logging
            if (message === 'uciok' || message.startsWith('bestmove')) {
              console.log('[Stockfish]', message);
            }

            // Check for UCI OK (ready)
            if (message === 'uciok') {
              if (mounted) {
                console.log('[Stockfish] Engine ready');
                setIsReady(true);
              }
            }

            // Check for bestmove
            if (message.startsWith('bestmove')) {
              const parts = message.split(' ');
              const move = parts[1];

              if (move && move !== '(none)') {
                console.log('[Stockfish] Best move:', move);
                pendingMoveRef.current = move;
              }
            }
          }
        };

        worker.onerror = (error) => {
          console.error('Stockfish worker error:', error);
          onErrorEvent('Failed to initialize chess engine');
        };

        // Initialize UCI
        worker.postMessage('uci');

        workerRef.current = worker;

        // Cleanup URL after worker is created
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to load Stockfish:', error);
        onErrorEvent('Failed to load chess engine');
      }
    };

    initWorker();

    return () => {
      mounted = false;
      setIsReady(false);
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []); // No dependencies - only run once on mount

  // Update skill level when difficulty changes
  useEffect(() => {
    if (workerRef.current && isReady) {
      const config = DIFFICULTY_CONFIGS[difficulty];
      workerRef.current.postMessage(`setoption name Skill Level value ${config.skillLevel}`);
    }
  }, [difficulty, isReady]);

  // Find best move
  const findBestMove = useCallback(
    (fen: string) => {
      console.log('[Stockfish] findBestMove called', { isReady, hasWorker: !!workerRef.current, fen });

      if (!workerRef.current || !isReady) {
        console.warn('[Stockfish] Not ready - worker:', !!workerRef.current, 'isReady:', isReady);
        return;
      }

      setIsThinking(true);
      pendingMoveRef.current = null;

      const config = DIFFICULTY_CONFIGS[difficulty];
      console.log('[Stockfish] Sending position and go command', { depth: config.depth });

      // Set position
      workerRef.current.postMessage(`position fen ${fen}`);

      // Start calculating
      workerRef.current.postMessage(`go depth ${config.depth}`);

      // Add artificial thinking time for better UX
      thinkingTimeoutRef.current = setTimeout(() => {
        if (pendingMoveRef.current) {
          const move = pendingMoveRef.current;
          pendingMoveRef.current = null;
          setIsThinking(false);
          onBestMoveEvent(move);
        } else {
          // If no move yet, wait a bit more with polling
          let attempts = 0;
          const maxAttempts = 100; // 10 seconds max
          const checkInterval = setInterval(() => {
            attempts++;
            if (pendingMoveRef.current) {
              clearInterval(checkInterval);
              const move = pendingMoveRef.current;
              pendingMoveRef.current = null;
              setIsThinking(false);
              onBestMoveEvent(move);
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
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
    if (workerRef.current) {
      workerRef.current.postMessage('stop');
    }
    if (thinkingTimeoutRef.current) {
      clearTimeout(thinkingTimeoutRef.current);
    }
    setIsThinking(false);
    pendingMoveRef.current = null;
  }, []);

  return {
    isReady,
    isThinking,
    findBestMove,
    stop,
  };
}

// Parse UCI move format (e.g., "e2e4" or "e7e8q" for promotion)
export function parseUCIMove(uciMove: string): { from: string; to: string; promotion?: string } {
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

  return { from, to, promotion };
}
