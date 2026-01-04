// ==============================================
// Chess Blitz - Global Type Declarations
// ==============================================

/**
 * MSN Start Games SDK interface
 */
interface MSStartSDK {
  isInMsStartGame: () => boolean;
  getLocale: () => string;
  getEntryPoint: () => string;
  ping: () => Promise<void>;
  share: (options: ShareOptions) => Promise<void>;

  // User Identity
  getPlayerId: () => Promise<string | null>;
  getConsentString: () => Promise<string | null>;

  // Leaderboards
  submitScore: (score: number, metadata?: Record<string, unknown>) => Promise<void>;
  getLeaderboard: (options?: LeaderboardOptions) => Promise<LeaderboardEntry[]>;
  getPlayerRank: () => Promise<number | null>;

  // Cloud Saves
  saveGameState: (key: string, data: unknown) => Promise<void>;
  loadGameState: (key: string) => Promise<unknown>;
  deleteGameState: (key: string) => Promise<void>;

  // Audio
  getAudioMuted: () => boolean;
  onAudioMuteChange: (callback: (muted: boolean) => void) => void;

  // Ads
  loadDisplayAd: (slot: string) => Promise<void>;
  showDisplayAd: (slot: string) => Promise<void>;
  hideDisplayAd: (slot: string) => Promise<void>;
  loadInterstitialAd: () => Promise<void>;
  showInterstitialAd: () => Promise<void>;
  loadRewardedAd: () => Promise<void>;
  showRewardedAd: () => Promise<void>;
  isRewardedAdReady: () => boolean;
  onRewardedAdCompleted: (callback: () => void) => void;
}

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

interface LeaderboardOptions {
  period?: 'daily' | 'weekly' | 'monthly' | 'allTime';
  count?: number;
}

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  score: number;
  displayName?: string;
}

/**
 * Extend Window interface to include MSN Start SDK
 */
declare global {
  interface Window {
    $msstart?: MSStartSDK;
  }
}

export {};
