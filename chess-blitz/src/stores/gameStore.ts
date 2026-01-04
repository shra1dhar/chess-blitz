// ==============================================
// Chess Blitz - Game State Store (Zustand)
// ==============================================

import { create } from 'zustand';
import { Chess, type Square, type PieceSymbol, type Color } from 'chess.js';
import type {
  GameState,
  GameStatus,
  GameResult,
  Difficulty,
  GameMove,
  CapturedPieces,
  DrawReason,
} from '@/types/chess';
import { INITIAL_FEN } from '@/types/chess';

interface GameStore extends GameState {
  // Chess.js instance
  chess: Chess;

  // Actions
  newGame: (playerColor: Color, difficulty: Difficulty) => void;
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  undoMove: () => boolean;
  redoMove: () => boolean;
  resign: () => void;
  reset: () => void;

  // Helpers
  getLegalMoves: (square: Square) => Square[];
  isLegalMove: (from: Square, to: Square) => boolean;
  getGamePgn: () => string;
}

// Calculate captured pieces from move history
function calculateCapturedPieces(moves: GameMove[]): CapturedPieces {
  const captured: CapturedPieces = { white: [], black: [] };

  for (const move of moves) {
    if (move.captured) {
      // If white made the move, they captured a black piece
      if (move.color === 'w') {
        captured.white.push(move.captured);
      } else {
        captured.black.push(move.captured);
      }
    }
  }

  return captured;
}

// Determine draw reason
function getDrawReason(chess: Chess): DrawReason | undefined {
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isInsufficientMaterial()) return 'insufficient_material';
  if (chess.isThreefoldRepetition()) return 'threefold_repetition';
  if (chess.isDraw()) return 'fifty_move_rule';
  return undefined;
}

// Create initial state
function createInitialState(): Omit<GameState, 'chess'> {
  return {
    fen: INITIAL_FEN,
    turn: 'w',
    status: 'idle',
    result: null,
    drawReason: undefined,
    moves: [],
    moveIndex: -1,
    capturedPieces: { white: [], black: [] },
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    lastMove: null,
    playerColor: 'w',
    botDifficulty: 'medium',
    startedAt: null,
    endedAt: null,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  chess: new Chess(),
  ...createInitialState(),

  // Start a new game
  newGame: (playerColor: Color, difficulty: Difficulty) => {
    const chess = new Chess();

    set({
      chess,
      fen: chess.fen(),
      turn: 'w',
      status: 'playing',
      result: null,
      drawReason: undefined,
      moves: [],
      moveIndex: -1,
      capturedPieces: { white: [], black: [] },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      lastMove: null,
      playerColor,
      botDifficulty: difficulty,
      startedAt: Date.now(),
      endedAt: null,
    });
  },

  // Make a move
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => {
    const { chess, status, moves, moveIndex } = get();

    if (status !== 'playing') return false;

    try {
      // If we're not at the end of the move list, remove future moves
      const currentMoves = moveIndex < moves.length - 1
        ? moves.slice(0, moveIndex + 1)
        : moves;

      const move = chess.move({
        from,
        to,
        promotion: promotion || 'q', // Default to queen promotion
      });

      if (!move) return false;

      const newMove: GameMove = {
        ...move,
        timestamp: Date.now(),
      };

      const newMoves = [...currentMoves, newMove];
      const capturedPieces = calculateCapturedPieces(newMoves);

      // Check game end conditions
      let newStatus: GameStatus = 'playing';
      let newResult: GameResult = null;
      let drawReason: DrawReason | undefined;

      if (chess.isCheckmate()) {
        newStatus = 'checkmate';
        // The player who just moved won
        newResult = move.color === get().playerColor ? 'win' : 'loss';
      } else if (chess.isStalemate()) {
        newStatus = 'stalemate';
        newResult = 'draw';
        drawReason = 'stalemate';
      } else if (chess.isDraw()) {
        newStatus = 'draw';
        newResult = 'draw';
        drawReason = getDrawReason(chess);
      }

      set({
        fen: chess.fen(),
        turn: chess.turn(),
        status: newStatus,
        result: newResult,
        drawReason,
        moves: newMoves,
        moveIndex: newMoves.length - 1,
        capturedPieces,
        isCheck: chess.isCheck(),
        isCheckmate: chess.isCheckmate(),
        isStalemate: chess.isStalemate(),
        isDraw: chess.isDraw(),
        lastMove: { from, to },
        endedAt: newStatus !== 'playing' ? Date.now() : null,
      });

      return true;
    } catch (error) {
      console.error('Invalid move:', error);
      return false;
    }
  },

  // Undo the last move
  undoMove: () => {
    const { chess, moves, moveIndex, status } = get();

    if (status !== 'playing' || moveIndex < 0) return false;

    // In bot game, undo both the bot's move and the player's move
    chess.undo(); // Undo bot's move
    chess.undo(); // Undo player's move

    const newMoveIndex = Math.max(-1, moveIndex - 2);

    set({
      fen: chess.fen(),
      turn: chess.turn(),
      moveIndex: newMoveIndex,
      isCheck: chess.isCheck(),
      lastMove: newMoveIndex >= 0
        ? { from: moves[newMoveIndex].from as Square, to: moves[newMoveIndex].to as Square }
        : null,
      capturedPieces: calculateCapturedPieces(moves.slice(0, newMoveIndex + 1)),
    });

    return true;
  },

  // Redo a move (if available)
  redoMove: () => {
    const { chess, moves, moveIndex, status } = get();

    if (status !== 'playing' || moveIndex >= moves.length - 1) return false;

    const nextMove = moves[moveIndex + 1];
    const move = chess.move({
      from: nextMove.from as Square,
      to: nextMove.to as Square,
      promotion: nextMove.promotion,
    });

    if (!move) return false;

    set({
      fen: chess.fen(),
      turn: chess.turn(),
      moveIndex: moveIndex + 1,
      isCheck: chess.isCheck(),
      lastMove: { from: nextMove.from as Square, to: nextMove.to as Square },
      capturedPieces: calculateCapturedPieces(moves.slice(0, moveIndex + 2)),
    });

    return true;
  },

  // Resign the game
  resign: () => {
    const { status, playerColor } = get();

    if (status !== 'playing') return;

    set({
      status: 'resigned',
      result: 'loss',
      endedAt: Date.now(),
    });
  },

  // Reset to initial state
  reset: () => {
    set({
      chess: new Chess(),
      ...createInitialState(),
    });
  },

  // Get legal moves for a square
  getLegalMoves: (square: Square) => {
    const { chess, status } = get();

    if (status !== 'playing') return [];

    const moves = chess.moves({ square, verbose: true });
    return moves.map((m) => m.to as Square);
  },

  // Check if a move is legal
  isLegalMove: (from: Square, to: Square) => {
    const { chess, status } = get();

    if (status !== 'playing') return false;

    const moves = chess.moves({ square: from, verbose: true });
    return moves.some((m) => m.to === to);
  },

  // Get game PGN
  getGamePgn: () => {
    const { chess } = get();
    return chess.pgn();
  },
}));

// Selectors
export const selectIsPlayerTurn = (state: GameStore) =>
  state.status === 'playing' && state.turn === state.playerColor;

export const selectIsBotTurn = (state: GameStore) =>
  state.status === 'playing' && state.turn !== state.playerColor;

export const selectIsGameOver = (state: GameStore) =>
  state.status !== 'idle' && state.status !== 'playing';

export const selectMoveCount = (state: GameStore) =>
  Math.floor(state.moves.length / 2) + (state.moves.length % 2);

export const selectCanUndo = (state: GameStore) =>
  state.status === 'playing' && state.moveIndex >= 1;

export const selectCanRedo = (state: GameStore) =>
  state.status === 'playing' && state.moveIndex < state.moves.length - 1;
