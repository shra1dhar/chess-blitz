// Matchmaking constants
export const MATCHMAKING = {
  INITIAL_ELO_RANGE: 300,
  RANGE_EXPANSION_INTERVAL_MS: 5000,
  RANGE_EXPANSION_AMOUNT: 50,
  MAX_ELO_RANGE: 500,
  BOT_FALLBACK_TIMEOUT_MS: 8_000,
  MAX_QUEUE_SIZE: 500,
  MAX_WAIT_MS: 120_000,
  AVOID_RECENT_OPPONENTS_COUNT: 3,
  SMALL_QUEUE_THRESHOLD: 20, // Allow recent opponents when queue smaller than this
  REMATCH_INTENT_TTL_MS: 300_000, // 5 minutes - how long rematch intent persists
} as const;

// ELO constants
export const ELO = {
  K_FACTOR: 32,
  STARTING: 900,
  FLOOR: 100,
} as const;
