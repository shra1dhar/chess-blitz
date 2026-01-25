// ==============================================
// Chess Blitz - TypeScript Types
// ==============================================

import type { Chess, Square, PieceSymbol, Color } from 'chess.js';

// Game difficulty levels
export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export interface DifficultyConfig {
  name: string;
  description: string;
  skillLevel: number; // Stockfish skill level (0-20)
  depth: number; // Search depth
  thinkingTime: number; // Milliseconds to "think" (for UX)
  eloRange: string;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  beginner: {
    name: 'Beginner',
    description: 'Perfect for beginners',
    skillLevel: 0, // Lowest skill level - makes frequent blunders
    depth: 1, // Very shallow search
    thinkingTime: 300,
    eloRange: '400-600',
  },
  easy: {
    name: 'Easy',
    description: 'Casual play',
    skillLevel: 1, // Low skill - still weak but plays recognizable chess
    depth: 2,
    thinkingTime: 400,
    eloRange: '600-900',
  },
  medium: {
    name: 'Medium',
    description: 'Balanced challenge',
    skillLevel: 3, // Balanced for ~900-1200 rated players
    depth: 4,
    thinkingTime: 600,
    eloRange: '900-1200',
  },
  hard: {
    name: 'Hard',
    description: 'Strong tactical play',
    skillLevel: 5, // Challenging for club players
    depth: 6,
    thinkingTime: 1000,
    eloRange: '1200-1500',
  },
  expert: {
    name: 'Expert',
    description: 'Near-perfect play',
    skillLevel: 8, // Very strong tactical play
    depth: 10,
    thinkingTime: 1200,
    eloRange: '1500+',
  },
};

// Board themes
export type BoardTheme = 'wood' | 'green' | 'blue' | 'purple';

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
  purple: {
    name: 'Purple',
    description: 'Vibrant purple and lavender',
  },
};

// Piece sets
export type PieceSet = 'classic' | 'standard' | 'metal';

export interface PieceSetConfig {
  name: string;
  description: string;
  basePath?: string; // For custom piece sets with images
}

export const PIECE_SETS: Record<PieceSet, PieceSetConfig> = {
  classic: {
    name: 'Classic',
    description: 'Traditional SVG pieces',
    // No basePath - uses library built-in SVGs
  },
  standard: {
    name: 'Standard',
    description: 'Custom standard pieces',
    basePath: '/theme/pieces/standard',
  },
  metal: {
    name: 'Metal',
    description: 'Polished metal pieces',
    basePath: '/theme/pieces/metal',
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
  pieceSet: PieceSet;
  soundEnabled: boolean;
  showLegalMoves: boolean;
  autoQueen: boolean; // Auto-promote to queen
  confirmMoves: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast' | 'none';
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'wood',
  pieceSet: 'standard',
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
