// ==============================================
// Chess Blitz - TypeScript Types
// ==============================================

import type { Chess, Square, PieceSymbol, Color } from 'chess.js';

// Game difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface DifficultyConfig {
  name: string;
  description: string;
  skillLevel: number; // Stockfish skill level (0-20)
  depth: number; // Search depth
  thinkingTime: number; // Milliseconds to "think" (for UX)
  eloRange: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    name: 'Easy',
    description: 'Perfect for beginners',
    skillLevel: 0, // Lowest skill level - makes many mistakes
    depth: 1, // Very shallow search
    thinkingTime: 300,
    eloRange: '300-500',
  },
  medium: {
    name: 'Medium',
    description: 'Casual play',
    skillLevel: 2, // Low skill - still makes mistakes
    depth: 3, // Shallow search
    thinkingTime: 500,
    eloRange: '600-900',
  },
  hard: {
    name: 'Hard',
    description: 'Balanced challenge',
    skillLevel: 4,
    depth: 4,
    thinkingTime: 1000,
    eloRange: '1000-1300',
  },
  expert: {
    name: 'Expert',
    description: 'Strong tactical play',
    skillLevel: 8,
    depth: 8,
    thinkingTime: 1200,
    eloRange: '1400+',
  },
};

// Board themes
export type BoardTheme = 'wood' | 'green' | 'blue' | 'midnight';

export interface BoardThemeConfig {
  name: string;
  description: string;
}

export const BOARD_THEMES: Record<BoardTheme, BoardThemeConfig> = {
  wood: {
    name: 'Classic Wood',
    description: 'Warm walnut and maple tones',
  },
  green: {
    name: 'Tournament',
    description: 'Classic green and cream',
  },
  blue: {
    name: 'Blue Ocean',
    description: 'Cool blue tones',
  },
  midnight: {
    name: 'Midnight',
    description: 'Dark mode friendly',
  },
};

// Game status
export type GameStatus =
  | 'idle'
  | 'playing'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'resigned';

export type GameResult = 'win' | 'loss' | 'draw' | null;

export type DrawReason =
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move_rule';

// Piece representation
export interface Piece {
  type: PieceSymbol;
  color: Color;
}

// Move with additional info - simplified from chess.js Move type
export interface GameMove {
  color: Color;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  flags: string;
  san: string;
  lan: string;
  before: string;
  after: string;
  timestamp?: number;
}

// Captured pieces tracking
export interface CapturedPieces {
  white: PieceSymbol[]; // Pieces captured BY white (black pieces)
  black: PieceSymbol[]; // Pieces captured BY black (white pieces)
}

// Player info
export interface Player {
  color: Color;
  isBot: boolean;
  name: string;
}

// Game state
export interface GameState {
  // Core game state
  fen: string;
  turn: Color;
  status: GameStatus;
  result: GameResult;
  drawReason?: DrawReason;

  // Move tracking
  moves: GameMove[];
  moveIndex: number; // For undo/redo

  // Captured pieces
  capturedPieces: CapturedPieces;

  // Check state
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;

  // Last move (for highlighting)
  lastMove: {
    from: Square;
    to: Square;
  } | null;

  // Players
  playerColor: Color;
  botDifficulty: Difficulty;

  // Statistics
  startedAt: number | null;
  endedAt: number | null;
}

// User settings
export interface UserSettings {
  theme: BoardTheme;
  soundEnabled: boolean;
  showLegalMoves: boolean;
  autoQueen: boolean; // Auto-promote to queen
  confirmMoves: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast' | 'none';
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'wood',
  soundEnabled: true,
  showLegalMoves: true,
  autoQueen: true,
  confirmMoves: false,
  animationSpeed: 'normal',
};

// Stockfish message types
export type StockfishMessage =
  | { type: 'ready' }
  | { type: 'bestmove'; move: string; ponder?: string }
  | { type: 'info'; depth?: number; score?: number; pv?: string[] }
  | { type: 'error'; message: string };

export type StockfishCommand =
  | { type: 'init' }
  | { type: 'position'; fen: string }
  | { type: 'go'; depth?: number; movetime?: number }
  | { type: 'stop' }
  | { type: 'setoption'; name: string; value: string | number };

// Sound effects (re-export from soundManager for convenience)
export type { SoundName } from '@/services/soundManager';

// Legacy alias for backwards compatibility
export type SoundEffect =
  | 'move'
  | 'capture'
  | 'checkmate'
  | 'castle'
  | 'promote'
  | 'illegal'
  | 'tick'
  | 'gameStart'
  | 'gameEnd'
  | 'lowTime';

// Animation speed values (in milliseconds)
export const ANIMATION_SPEEDS: Record<UserSettings['animationSpeed'], number> = {
  slow: 500,
  normal: 300,
  fast: 150,
  none: 0,
};

// Piece values for material calculation
export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0, // King has no material value
};

// Initial position
export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Helper type for chess.js instance
export type ChessInstance = Chess;
