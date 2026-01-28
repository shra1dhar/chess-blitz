// ==============================================
// Chess Blitz - Integration Types
// Abstraction layer for gaming platform integrations
// ==============================================

/**
 * Supported integration platforms (PascalCase enum)
 */
export enum IntegrationType {
  Msn = 'msn',
  CrazyGames = 'crazygames',
  None = 'none',
}

/**
 * SDK URLs for each integration platform
 */
export const INTEGRATION_SDK_URLS: Record<IntegrationType, string | null> = {
  [IntegrationType.Msn]:
    'https://assets.msn.com/staticsb/statics/latest/msstart-games-sdk/msstart-v1.0.0-rc.22.min.js',
  [IntegrationType.CrazyGames]: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
  [IntegrationType.None]: null,
};

/**
 * Parse integration type from query parameter value
 * Returns IntegrationType.None if not recognized
 */
export function parseIntegrationType(value: string | null | undefined): IntegrationType {
  if (!value) return IntegrationType.None;

  const normalized = value.toLowerCase();
  switch (normalized) {
    case 'msn':
      return IntegrationType.Msn;
    case 'crazygames':
      return IntegrationType.CrazyGames;
    default:
      return IntegrationType.None;
  }
}

// ==============================================
// Shared Types for Integration Services
// ==============================================

/**
 * Audio state from platform
 */
export interface AudioState {
  isMuted: boolean;
}

/**
 * Leaderboard entry (common structure)
 */
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  score: number;
  displayName?: string;
}

/**
 * Leaderboard query options
 */
export interface LeaderboardOptions {
  period?: 'daily' | 'weekly' | 'monthly' | 'allTime';
  count?: number;
}

/**
 * Share options
 */
export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}
