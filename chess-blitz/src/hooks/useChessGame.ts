// ==============================================
// Chess Blitz - Chess Game Hook
// ==============================================

import { useCallback, useEffect, useRef, useEffectEvent } from 'react';
import type { Square, PieceSymbol, Color } from 'chess.js';
import { useGameStore, selectIsBotTurn, selectIsPlayerTurn, selectIsGameOver } from '@/stores/gameStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useStockfish, parseUCIMove } from './useStockfish';
import { useSound } from './useSound';
import type { Difficulty, GameResult, GameStatus } from '@/types/chess';

interface UseChessGameOptions {
  playerColor?: Color;
  difficulty?: Difficulty;
}

interface UseChessGameReturn {
  // State
  fen: string;
  turn: Color;
  isPlayerTurn: boolean;
  isBotTurn: boolean;
  isGameOver: boolean;
  isCheck: boolean;
  isThinking: boolean;
  isEngineReady: boolean;
  lastMove: { from: Square; to: Square } | null;
  status: GameStatus;
  result: GameResult;
  playerColor: Color;
  moves: Array<{ san: string; from: string; to: string }>;

  // Actions
  startGame: (color: Color, difficulty: Difficulty) => void;
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  undoMove: () => void;
  resign: () => void;
  reset: () => void;

  // Helpers
  getLegalMoves: (square: Square) => Square[];
  isLegalMove: (from: Square, to: Square) => boolean;
}

export function useChessGame(options?: UseChessGameOptions): UseChessGameReturn {
  const {
    chess,
    fen,
    turn,
    status,
    result,
    isCheck,
    lastMove,
    moves,
    playerColor,
    botDifficulty,
    newGame,
    makeMove: storeMakeMove,
    undoMove: storeUndoMove,
    resign: storeResign,
    reset,
    getLegalMoves,
    isLegalMove,
  } = useGameStore();

  const { soundEnabled } = useSettingsStore();
  const {
    playMoveSound,
    playCaptureSound,
    playCheckmateSound,
    playCastleSound,
    playPromoteSound,
    playGameEndSound,
    playGameStartSound,
  } = useSound();

  const isPlayerTurn = useGameStore(selectIsPlayerTurn);
  const isBotTurn = useGameStore(selectIsBotTurn);
  const isGameOver = useGameStore(selectIsGameOver);

  const lastBotMoveRequestRef = useRef<string | null>(null);

  // Play sound for a move - uses useEffectEvent so it always has latest soundEnabled
  const playMoveSound_ = useEffectEvent((moveInfo: { flags: string; captured?: string; promotion?: string }) => {
    if (!soundEnabled) return;

    // Checkmate gets special sound
    if (chess.isCheckmate()) {
      playCheckmateSound();
    } else if (chess.isStalemate() || chess.isDraw()) {
      playGameEndSound();
    } else if (moveInfo.promotion) {
      playPromoteSound();
    } else if (moveInfo.flags.includes('k') || moveInfo.flags.includes('q')) {
      // Castle sound (k = kingside, q = queenside)
      playCastleSound();
    } else if (moveInfo.captured) {
      playCaptureSound();
    } else {
      playMoveSound();
    }
  });

  // Handle bot's best move - uses useEffectEvent so it doesn't cause Stockfish re-init
  const handleBotMove = useEffectEvent((uciMove: string) => {
    const { from, to, promotion } = parseUCIMove(uciMove);
    const success = storeMakeMove(from as Square, to as Square, promotion as PieceSymbol | undefined);

    if (success) {
      const moveInfo = chess.history({ verbose: true }).slice(-1)[0];
      if (moveInfo) {
        playMoveSound_(moveInfo);
      }
    }
  });

  // Initialize Stockfish
  const { isReady: isEngineReady, isThinking, findBestMove, stop } = useStockfish({
    difficulty: botDifficulty,
    onBestMove: handleBotMove,
    onError: (error) => console.error('Stockfish error:', error),
  });

  // Trigger bot move when it's bot's turn
  useEffect(() => {
    if (isBotTurn && isEngineReady && !isThinking && status === 'playing') {
      // Prevent duplicate requests
      if (lastBotMoveRequestRef.current === fen) {
        return;
      }
      lastBotMoveRequestRef.current = fen;

      // Small delay to let the UI update first
      const timeoutId = setTimeout(() => {
        findBestMove(fen);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isBotTurn, isEngineReady, isThinking, fen, findBestMove, status]);

  // Play game start sound - uses useEffectEvent for latest soundEnabled
  const playStartSound = useEffectEvent(() => {
    if (soundEnabled) {
      playGameStartSound();
    }
  });

  // Start a new game
  const startGame = useCallback(
    (color: Color, difficulty: Difficulty) => {
      stop(); // Stop any ongoing calculation
      lastBotMoveRequestRef.current = null;
      newGame(color, difficulty);
      playStartSound();
    },
    [newGame, stop, playStartSound]
  );

  // Make a player move
  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!isPlayerTurn) return false;

      const success = storeMakeMove(from, to, promotion);

      if (success) {
        const moveInfo = chess.history({ verbose: true }).slice(-1)[0];
        if (moveInfo) {
          playMoveSound_(moveInfo);
        }
        // Reset bot move tracking for new position
        lastBotMoveRequestRef.current = null;
      }

      return success;
    },
    [isPlayerTurn, storeMakeMove, chess, playMoveSound_]
  );

  // Undo move
  const undoMove = useCallback(() => {
    stop(); // Stop any ongoing calculation
    lastBotMoveRequestRef.current = null;
    storeUndoMove();
  }, [storeUndoMove, stop]);

  // Play game end sound - uses useEffectEvent for latest soundEnabled
  const playEndSound = useEffectEvent(() => {
    if (soundEnabled) {
      playGameEndSound();
    }
  });

  // Resign
  const resign = useCallback(() => {
    stop();
    storeResign();
    playEndSound();
  }, [storeResign, stop, playEndSound]);

  // Format moves for display
  const formattedMoves = moves.map((move) => ({
    san: move.san,
    from: move.from,
    to: move.to,
  }));

  return {
    fen,
    turn,
    isPlayerTurn,
    isBotTurn,
    isGameOver,
    isCheck,
    isThinking,
    isEngineReady,
    lastMove,
    status,
    result,
    playerColor,
    moves: formattedMoves,

    startGame,
    makeMove,
    undoMove,
    resign,
    reset,

    getLegalMoves,
    isLegalMove,
  };
}
