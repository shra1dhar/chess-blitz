// Game constants
export const GAME = {
  DISCONNECT_TIMEOUT_MS: 30_000,
  BOTH_DISCONNECT_TIMEOUT_MS: 60_000,
  NO_SHOW_TIMEOUT_MS: 30_000,
  REMATCH_TIMEOUT_MS: 30_000,
  CLEANUP_TIMEOUT_MS: 60_000,
  ABORT_BEFORE_MOVE: 2,
  FIFTY_MOVE_RULE_HALFMOVES: 100,
  SEVENTY_FIVE_MOVE_RULE_HALFMOVES: 150,
  // First-move timeout: abort if player doesn't make first move
  FIRST_MOVE_TIMEOUT_MS: 20_000, // 20 seconds total
  FIRST_MOVE_WARNING_MS: 10_000, // Warning shown after 10 seconds
} as const;

// WebSocket message size limit
export const MAX_MESSAGE_SIZE_BYTES = 10 * 1024; // 10KB
