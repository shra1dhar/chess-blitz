// ==============================================
// Chess Blitz - Stockfish Singleton Service
// Single Worker instance shared across the app
// ==============================================

type BestMoveCallback = (move: string) => void;
export type EngineVersion = 'wasm' | 'asm' | null;

const STOCKFISH_WASM_URL = '/stockfish/stockfish-17-wasm.js';
const STOCKFISH_ASM_URL = '/stockfish/stockfish-10-asm.js';

// Singleton state
let worker: Worker | null = null;
let isReady = false;
let engineVersion: EngineVersion = null;
let currentCallback: BestMoveCallback | null = null;
let initPromise: Promise<EngineVersion> | null = null;

/**
 * Check if browser supports WebAssembly
 */
function hasWasmSupport(): boolean {
  try {
    return (
      typeof WebAssembly === 'object' &&
      WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))
    );
  } catch {
    return false;
  }
}

/**
 * Create and initialize a Stockfish Worker
 */
function createWorker(url: string, version: 'wasm' | 'asm'): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[Stockfish] Creating Worker with ${version} engine`);
    const w = new Worker(url);

    w.onmessage = (event) => {
      const msg = event.data;
      if (typeof msg !== 'string') return;

      if (msg === 'uciok') {
        console.log(`[Stockfish] Engine ready (${version})`);
        isReady = true;
        engineVersion = version;
        worker = w;
        resolve();
      }

      if (msg.startsWith('bestmove') && currentCallback) {
        const move = msg.split(' ')[1];
        if (move && move !== '(none)') {
          console.log('[Stockfish] Best move:', move);
          currentCallback(move);
        }
      }
    };

    w.onerror = (error) => {
      console.error(`[Stockfish] ${version} Worker error:`, error);
      w.terminate();
      reject(error);
    };

    w.postMessage('uci');
  });
}

/**
 * Initialize the Stockfish singleton.
 * Returns immediately if already initialized.
 * Safe to call multiple times - will return the same promise if init is in progress.
 */
export async function initStockfish(): Promise<EngineVersion> {
  // Already ready
  if (isReady && worker) {
    return engineVersion;
  }

  // Init in progress, return existing promise
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = (async () => {
    const useWasm = hasWasmSupport();
    console.log(`[Stockfish] Initializing (WASM support: ${useWasm})`);

    try {
      await createWorker(useWasm ? STOCKFISH_WASM_URL : STOCKFISH_ASM_URL, useWasm ? 'wasm' : 'asm');
    } catch {
      if (useWasm) {
        console.log('[Stockfish] WASM failed, falling back to asm.js');
        await createWorker(STOCKFISH_ASM_URL, 'asm');
      } else {
        throw new Error('Failed to initialize Stockfish');
      }
    }

    return engineVersion;
  })();

  return initPromise;
}

/**
 * Set the Stockfish skill level (0-20)
 */
export function setSkillLevel(level: number): void {
  if (worker && isReady) {
    worker.postMessage(`setoption name Skill Level value ${level}`);
  }
}

/**
 * Request the best move for a given FEN position.
 * The callback will be invoked when Stockfish returns the best move.
 */
export function findBestMove(fen: string, depth: number, callback: BestMoveCallback): void {
  if (!worker || !isReady) {
    console.warn('[Stockfish] Not ready');
    return;
  }
  currentCallback = callback;
  worker.postMessage(`position fen ${fen}`);
  worker.postMessage(`go depth ${depth}`);
}

/**
 * Stop the current calculation
 */
export function stopCalculation(): void {
  worker?.postMessage('stop');
  currentCallback = null;
}

/**
 * Completely terminate the Stockfish Worker.
 * Call this when the app is being unmounted or you want to free resources.
 */
export function terminateStockfish(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  isReady = false;
  engineVersion = null;
  currentCallback = null;
  initPromise = null;
}

/**
 * Get the current status of the Stockfish singleton
 */
export function getStatus(): { isReady: boolean; engineVersion: EngineVersion } {
  return { isReady, engineVersion };
}
