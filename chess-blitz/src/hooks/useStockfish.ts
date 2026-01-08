// ==============================================
// Chess Blitz - Stockfish AI Hook
// Simplified implementation following Lichess pattern
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
  engineVersion: 'wasm' | 'asm' | null;
  findBestMove: (fen: string) => void;
  stop: () => void;
}

// Stockfish paths
const STOCKFISH_WASM_URL = '/stockfish/stockfish-17-wasm.js';
const STOCKFISH_ASM_URL = '/stockfish/stockfish-10-asm.js';

/**
 * Check if browser supports WebAssembly (Lichess pattern)
 */
function hasWasmSupport(): boolean {
  try {
    return typeof WebAssembly === 'object' &&
      WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
  } catch {
    return false;
  }
}

/**
 * Create message handler for Stockfish worker
 */
function createMessageHandler(
  onReady: () => void,
  onMove: (move: string) => void,
  version: 'wasm' | 'asm'
) {
  return (event: MessageEvent) => {
    const msg = event.data;
    if (typeof msg !== 'string') return;

    if (msg === 'uciok') {
      console.log(`[Stockfish] Engine ready (${version})`);
      onReady();
    }

    if (msg.startsWith('bestmove')) {
      const move = msg.split(' ')[1];
      if (move && move !== '(none)') {
        console.log('[Stockfish] Best move:', move);
        onMove(move);
      }
    }
  };
}

export function useStockfish({
  difficulty,
  onBestMove,
  onError,
}: UseStockfishOptions): UseStockfishReturn {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [engineVersion, setEngineVersion] = useState<'wasm' | 'asm' | null>(null);
  const pendingMoveRef = useRef<string | null>(null);
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callbacks via useEffectEvent
  const onBestMoveEvent = useEffectEvent((move: string) => onBestMove(move));
  const onErrorEvent = useEffectEvent((error: string) => onError?.(error));

  // Initialize Stockfish worker
  useEffect(() => {
    let mounted = true;
    const useWasm = hasWasmSupport();
    const version: 'wasm' | 'asm' = useWasm ? 'wasm' : 'asm';

    console.log(`[Stockfish] Loading ${version} version`);

    const initWorker = (url: string, ver: 'wasm' | 'asm', isFallback = false) => {
      const worker = new Worker(url);

      worker.onmessage = createMessageHandler(
        () => {
          if (mounted) {
            setIsReady(true);
            setEngineVersion(ver);
          }
        },
        (move) => {
          pendingMoveRef.current = move;
        },
        ver
      );

      worker.onerror = (error) => {
        console.error(`Stockfish ${ver} error:`, error);

        // If WASM failed and not already a fallback, try asm.js
        if (ver === 'wasm' && !isFallback && mounted) {
          console.log('[Stockfish] WASM failed, falling back to asm.js');
          workerRef.current?.terminate();
          initWorker(STOCKFISH_ASM_URL, 'asm', true);
          return;
        }

        onErrorEvent('Failed to initialize chess engine');
      };

      worker.postMessage('uci');
      workerRef.current = worker;
    };

    initWorker(useWasm ? STOCKFISH_WASM_URL : STOCKFISH_ASM_URL, version);

    return () => {
      mounted = false;
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

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
      if (!workerRef.current || !isReady) {
        console.warn('[Stockfish] Not ready');
        return;
      }

      setIsThinking(true);
      pendingMoveRef.current = null;

      const config = DIFFICULTY_CONFIGS[difficulty];

      // Send position and start calculation
      workerRef.current.postMessage(`position fen ${fen}`);
      workerRef.current.postMessage(`go depth ${config.depth}`);

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
    workerRef.current?.postMessage('stop');
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
