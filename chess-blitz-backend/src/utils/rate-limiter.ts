import { RATE_LIMITS } from "@chess-blitz/shared";

/**
 * Configuration for a rate limit window.
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * State for tracking rate limit within a window.
 */
export interface RateLimitState {
  count: number;
  windowStart: number;
}

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  allowed: boolean;
  newState: RateLimitState;
  retryAfterMs?: number;
}

/**
 * Predefined rate limit configurations from shared constants.
 */
export const RATE_LIMIT_CONFIGS = {
  messages: {
    maxRequests: RATE_LIMITS.MESSAGES_PER_SECOND,
    windowMs: 1000,
  } as RateLimitConfig,
  queueJoins: {
    maxRequests: RATE_LIMITS.QUEUE_JOINS_PER_MINUTE,
    windowMs: 60_000,
  } as RateLimitConfig,
  drawOffers: {
    maxRequests: 1,
    windowMs: RATE_LIMITS.DRAW_OFFER_COOLDOWN_MS,
  } as RateLimitConfig,
} as const;

/**
 * Check if a request is allowed under the given rate limit.
 * Returns the new state and whether the request was allowed.
 */
export function checkRateLimit(
  state: RateLimitState,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();

  // Reset window if expired
  if (now - state.windowStart >= config.windowMs) {
    return {
      allowed: true,
      newState: { count: 1, windowStart: now },
    };
  }

  // Check if under limit
  if (state.count < config.maxRequests) {
    return {
      allowed: true,
      newState: { count: state.count + 1, windowStart: state.windowStart },
    };
  }

  // Rate limited - calculate retry time
  const retryAfterMs = config.windowMs - (now - state.windowStart);
  return {
    allowed: false,
    newState: state,
    retryAfterMs,
  };
}

/**
 * Create initial rate limit state.
 */
export function createRateLimitState(): RateLimitState {
  return { count: 0, windowStart: Date.now() };
}
