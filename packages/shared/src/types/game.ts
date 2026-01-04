// Game results
export const GAME_RESULTS = ["1-0", "0-1", "1/2-1/2", "*"] as const;
export type GameResult = (typeof GAME_RESULTS)[number];

export const RESULT_REASONS = [
  "checkmate",
  "timeout",
  "resignation",
  "stalemate",
  "draw_agreement",
  "fifty_move",
  "seventy_five_move",
  "threefold_repetition",
  "fivefold_repetition",
  "insufficient_material",
  "timeout_vs_insufficient",
  "abort",
  "disconnect",
  "no_show",
] as const;
export type ResultReason = (typeof RESULT_REASONS)[number];

// Colors
export type Color = "white" | "black";
export type ChessColor = "w" | "b";

// Bot difficulty
export const BOT_DIFFICULTY = {
  easy: { minElo: 800, maxElo: 1000, name: "Bot (Easy)", thinkTimeMs: 500 },
  medium: { minElo: 1200, maxElo: 1500, name: "Bot (Medium)", thinkTimeMs: 1000 },
  hard: { minElo: 1800, maxElo: 2200, name: "Bot (Hard)", thinkTimeMs: 2000 },
} as const;

export type BotDifficulty = keyof typeof BOT_DIFFICULTY;
