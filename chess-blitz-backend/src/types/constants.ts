// Tournament types
export const TOURNAMENT_TYPES = ["bullet", "blitz", "rapid", "classical"] as const;
export type TournamentType = (typeof TOURNAMENT_TYPES)[number];

// Time controls in milliseconds
export const TIME_CONTROLS: Record<
  TournamentType,
  { initial: number; increment: number; name: string }
> = {
  bullet: { initial: 60_000, increment: 0, name: "1 min" },
  blitz: { initial: 180_000, increment: 0, name: "3 min" },
  rapid: { initial: 300_000, increment: 0, name: "5 min" },
  classical: { initial: 600_000, increment: 0, name: "10 min" },
};

// ELO constants
export const ELO = {
  K_FACTOR: 32,
  STARTING: 1200,
  FLOOR: 100,
} as const;

// Matchmaking constants
export const MATCHMAKING = {
  INITIAL_ELO_RANGE: 100,
  RANGE_EXPANSION_INTERVAL_MS: 5000,
  RANGE_EXPANSION_AMOUNT: 50,
  MAX_ELO_RANGE: 500,
  BOT_FALLBACK_TIMEOUT_MS: 30_000,
  MAX_QUEUE_SIZE: 500,
  MAX_WAIT_MS: 120_000,
  AVOID_RECENT_OPPONENTS_COUNT: 3,
} as const;

// Rate limiting
export const RATE_LIMITS = {
  QUEUE_JOINS_PER_MINUTE: 5,
  MESSAGES_PER_SECOND: 10,
  DRAW_OFFER_COOLDOWN_MS: 30_000,
  API_REQUESTS_PER_MINUTE: 60,
} as const;

// Game constants
export const GAME = {
  CLOCK_TICK_MS: 100,
  DISCONNECT_TIMEOUT_MS: 30_000,
  BOTH_DISCONNECT_TIMEOUT_MS: 60_000,
  NO_SHOW_TIMEOUT_MS: 30_000,
  REMATCH_TIMEOUT_MS: 30_000,
  CLEANUP_TIMEOUT_MS: 60_000,
  ABORT_BEFORE_MOVE: 2,
  FIFTY_MOVE_RULE_HALFMOVES: 100,
  SEVENTY_FIVE_MOVE_RULE_HALFMOVES: 150,
} as const;

// Bot difficulty ELO ranges
export const BOT_DIFFICULTY = {
  easy: { minElo: 800, maxElo: 1000, name: "Bot (Easy)", thinkTimeMs: 500 },
  medium: { minElo: 1200, maxElo: 1500, name: "Bot (Medium)", thinkTimeMs: 1000 },
  hard: { minElo: 1800, maxElo: 2200, name: "Bot (Hard)", thinkTimeMs: 2000 },
} as const;

export type BotDifficulty = keyof typeof BOT_DIFFICULTY;

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

// WebSocket message size limit
export const MAX_MESSAGE_SIZE_BYTES = 10 * 1024; // 10KB
