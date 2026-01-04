// ==============================================
// Chess Blitz - Chess Game Hook
// ==============================================

import { useCallback, useEffect, useRef } from 'react';
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

  // Handle bot's best move
  const handleBotMove = useCallback(
    (uciMove: string) => {
      const { from, to, promotion } = parseUCIMove(uciMove);
      const success = storeMakeMove(from as Square, to as Square, promotion as PieceSymbol | undefined);

      if (success && soundEnabled) {
        const moveInfo = chess.history({ verbose: true }).slice(-1)[0];
        if (moveInfo) {
          // Checkmate gets special sound
          if (chess.isCheckmate()) {
            playCheckmateSound();
          } else if (chess.isStalemate() || chess.isDraw()) {
            playGameEndSound();
          } else if (moveInfo.promotion) {
            // Promotion sound
            playPromoteSound();
          } else if (moveInfo.flags.includes('k') || moveInfo.flags.includes('q')) {
            // Castle sound (k = kingside, q = queenside)
            playCastleSound();
          } else if (moveInfo.captured) {
            playCaptureSound();
          } else {
            playMoveSound();
          }
        }
      }
    },
    [storeMakeMove, soundEnabled, chess, playMoveSound, playCaptureSound, playCheckmateSound, playCastleSound, playPromoteSound, playGameEndSound]
  );

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

  // Start a new game
  const startGame = useCallback(
    (color: Color, difficulty: Difficulty) => {
      stop(); // Stop any ongoing calculation
      lastBotMoveRequestRef.current = null;
      newGame(color, difficulty);

      if (soundEnabled) {
        playGameStartSound();
      }
    },
    [newGame, stop, soundEnabled, playGameStartSound]
  );

  // Make a player move
  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!isPlayerTurn) return false;

      const success = storeMakeMove(from, to, promotion);

      if (success && soundEnabled) {
        const moveInfo = chess.history({ verbose: true }).slice(-1)[0];
        if (moveInfo) {
          // Checkmate gets special sound
          if (chess.isCheckmate()) {
            playCheckmateSound();
          } else if (chess.isStalemate() || chess.isDraw()) {
            playGameEndSound();
          } else if (moveInfo.promotion) {
            // Promotion sound
            playPromoteSound();
          } else if (moveInfo.flags.includes('k') || moveInfo.flags.includes('q')) {
            // Castle sound (k = kingside, q = queenside)
            playCastleSound();
          } else if (moveInfo.captured) {
            playCaptureSound();
          } else {
            playMoveSound();
          }
        }
      }

      // Reset bot move tracking for new position
      if (success) {
        lastBotMoveRequestRef.current = null;
      }

      return success;
    },
    [isPlayerTurn, storeMakeMove, soundEnabled, chess, playMoveSound, playCaptureSound, playCheckmateSound, playCastleSound, playPromoteSound, playGameEndSound]
  );

  // Undo move
  const undoMove = useCallback(() => {
    stop(); // Stop any ongoing calculation
    lastBotMoveRequestRef.current = null;
    storeUndoMove();
  }, [storeUndoMove, stop]);

  // Resign
  const resign = useCallback(() => {
    stop();
    storeResign();
    if (soundEnabled) {
      playGameEndSound();
    }
  }, [storeResign, stop, soundEnabled, playGameEndSound]);

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
