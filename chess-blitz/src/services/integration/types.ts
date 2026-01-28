// ==============================================
// Chess Blitz - Integration Service Types
// Interface definition for platform integrations
// ==============================================

import type {
  IntegrationType,
  AudioState,
  LeaderboardEntry,
  LeaderboardOptions,
  ShareOptions,
} from '@/types/integration';

/**
 * Capabilities available for each integration platform
 */
export interface IntegrationCapabilities {
  hasAudio: boolean;
  hasAds: boolean;
  hasLeaderboards: boolean;
  hasCloudSaves: boolean;
  hasSharing: boolean;
  hasGameLifecycle: boolean;
  hasMultiplayer: boolean;
}

/**
 * Integration service interface
 * All platform implementations must implement this interface
 */
export interface IIntegrationService {
  readonly type: IntegrationType;
  readonly capabilities: IntegrationCapabilities;

  // ==============================================
  // Lifecycle
  // ==============================================

  /**
   * Initialize the integration service
   * Called after SDK script has loaded
   */
  initialize(): Promise<void>;

  /**
   * Check if the service is ready to use
   */
  isReady(): boolean;

  /**
   * Check if running in the platform's environment
   */
  isInPlatformEnvironment(): boolean;

  // ==============================================
  // Audio Control
  // ==============================================

  /**
   * Get current audio state from platform
   */
  getAudioState(): AudioState;

  /**
   * Subscribe to audio state changes
   * Returns unsubscribe function
   */
  onAudioStateChange(callback: (state: AudioState) => void): () => void;

  // ==============================================
  // Identity
  // ==============================================

  /**
   * Check if user account features are available on this platform
   * Should be checked before calling user-related methods
   */
  isUserAccountAvailable(): boolean;

  /**
   * Get unique player ID from platform
   * @deprecated Use getUserId() for true unique ID
   */
  getPlayerId(): Promise<string | null>;

  /**
   * Get unique user ID from platform
   * For CrazyGames: extracts userId from JWT token (not username, which can change)
   * For other platforms: returns platform-specific unique ID
   * Returns null for guest users or unsupported platforms
   */
  getUserId(): Promise<string | null>;

  /**
   * Get platform-specific auth token for backend verification
   * For CrazyGames: JWT token verified with RS256 using public key
   * Returns null for guest users or unsupported platforms
   */
  getPlatformToken(): Promise<string | null>;

  /**
   * Get user info from platform (username, avatar)
   * Returns null if user is not logged in or not available
   */
  getUser(): Promise<{ username: string; avatarUrl?: string } | null>;

  /**
   * Subscribe to auth state changes (login/logout)
   * Callback is called when user logs in or out
   * Returns unsubscribe function
   */
  onAuthStateChange(
    callback: (user: { username: string; avatarUrl?: string } | null) => void
  ): () => void;

  /**
   * Prompt user to log in (optional - not all platforms support this)
   * Returns user info if login successful, null if cancelled
   */
  showAuthPrompt?(): Promise<{ username: string; avatarUrl?: string } | null>;

  // ==============================================
  // Cloud Saves
  // ==============================================

  /**
   * Save game state to platform cloud storage
   */
  saveGameState(key: string, data: unknown): Promise<boolean>;

  /**
   * Load game state from platform cloud storage
   */
  loadGameState<T>(key: string): Promise<T | null>;

  /**
   * Delete game state from platform cloud storage
   */
  deleteGameState(key: string): Promise<boolean>;

  // ==============================================
  // Leaderboards
  // ==============================================

  /**
   * Submit score to platform leaderboard
   */
  submitScore(score: number, metadata?: Record<string, unknown>): Promise<boolean>;

  /**
   * Get leaderboard entries from platform
   */
  getLeaderboard(options?: LeaderboardOptions): Promise<LeaderboardEntry[]>;

  // ==============================================
  // Ads
  // ==============================================

  /**
   * Show an interstitial (midgame) ad
   * Returns true if ad was shown successfully
   */
  showInterstitialAd(): Promise<boolean>;

  /**
   * Show a rewarded ad
   * onComplete is called when user finishes watching
   * Returns true if ad was shown successfully
   */
  showRewardedAd(onComplete: () => void): Promise<boolean>;

  /**
   * Check if rewarded ad is ready to show
   */
  isRewardedAdReady(): boolean;

  // ==============================================
  // Sharing
  // ==============================================

  /**
   * Share game via platform sharing
   */
  share(options?: ShareOptions): Promise<boolean>;

  // ==============================================
  // Game Lifecycle (CrazyGames-specific)
  // These are optional methods that only some platforms support
  // ==============================================

  /**
   * Signal that gameplay has started
   */
  gameplayStart?(): void;

  /**
   * Signal that gameplay has stopped (menu, pause, etc.)
   */
  gameplayStop?(): void;

  /**
   * Signal that loading has started
   */
  loadingStart?(): void;

  /**
   * Signal that loading has stopped
   */
  loadingStop?(): void;

  /**
   * Trigger celebration for achievements
   */
  happyTime?(): void;

  // ==============================================
  // Multiplayer (CrazyGames "Play with Friends")
  // These are optional methods that only some platforms support
  // ==============================================

  /**
   * Check if this is an instant multiplayer session
   * (user clicked "Play with Friends" in platform UI)
   * Returns false for platforms that don't support this
   */
  isInstantMultiplayer?(): boolean;

  /**
   * Get room ID from invite link parameter
   * Returns null if user didn't come from an invite or platform doesn't support this
   */
  getInviteRoomId?(): string | null;

  /**
   * Show the platform's invite button
   * Triggers friend notifications in the platform
   * @param roomId - The room/lobby ID to share
   * @returns The generated invite link, or null if not supported
   */
  showInviteButton?(roomId: string): string | null;

  /**
   * Hide the invite button (when room fills or game starts)
   */
  hideInviteButton?(): void;

  /**
   * Generate an invite link without showing the button
   * @param roomId - The room/lobby ID to share
   * @returns The generated invite link, or null if not supported
   */
  getInviteLink?(roomId: string): string | null;
}
