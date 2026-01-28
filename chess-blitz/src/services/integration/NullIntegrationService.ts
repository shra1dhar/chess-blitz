// ==============================================
// Chess Blitz - Null Integration Service
// No-op implementation for dev mode and non-platform usage
// ==============================================

import {
  IntegrationType,
  type AudioState,
  type LeaderboardEntry,
  type LeaderboardOptions,
  type ShareOptions,
} from '@/types/integration';
import type { IIntegrationService, IntegrationCapabilities } from './types';

/**
 * Null integration service - used when no platform is active
 * Provides localStorage fallbacks and console logging for dev mode
 */
export class NullIntegrationService implements IIntegrationService {
  readonly type = IntegrationType.None;
  readonly capabilities: IntegrationCapabilities = {
    hasAudio: false,
    hasAds: false,
    hasLeaderboards: false,
    hasCloudSaves: true, // localStorage fallback
    hasSharing: true, // Web Share API fallback
    hasGameLifecycle: false,
    hasMultiplayer: false,
  };

  private ready = false;

  // ==============================================
  // Lifecycle
  // ==============================================

  async initialize(): Promise<void> {
    console.log('[Integration] NullIntegrationService initialized (dev mode)');
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  isInPlatformEnvironment(): boolean {
    return false;
  }

  // ==============================================
  // Audio Control
  // ==============================================

  getAudioState(): AudioState {
    return { isMuted: false };
  }

  onAudioStateChange(_callback: (state: AudioState) => void): () => void {
    // No-op - no platform audio control in dev mode
    return () => {};
  }

  // ==============================================
  // Identity
  // ==============================================

  /**
   * Check if user account features are available
   * No user module in dev/standalone mode
   */
  isUserAccountAvailable(): boolean {
    return false;
  }

  /**
   * Get unique user ID
   * Uses localStorage dev ID for consistency
   */
  async getUserId(): Promise<string | null> {
    return this.getPlayerId();
  }

  /**
   * Get platform-specific auth token
   * No token system in dev mode
   */
  async getPlatformToken(): Promise<string | null> {
    return null;
  }

  async getPlayerId(): Promise<string | null> {
    try {
      const devId = localStorage.getItem('chess-blitz-dev-player-id');
      if (devId) return devId;

      const newId = `dev-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('chess-blitz-dev-player-id', newId);
      return newId;
    } catch {
      return `dev-${Math.random().toString(36).substring(2, 15)}`;
    }
  }

  async getUser(): Promise<{ username: string; avatarUrl?: string } | null> {
    // No user module in dev/standalone mode
    return null;
  }

  /**
   * Subscribe to auth state changes
   * No auth events in dev mode, return no-op
   */
  onAuthStateChange(
    _callback: (user: { username: string; avatarUrl?: string } | null) => void
  ): () => void {
    return () => {};
  }

  // ==============================================
  // Cloud Saves (localStorage fallback)
  // ==============================================

  async saveGameState(key: string, data: unknown): Promise<boolean> {
    try {
      localStorage.setItem(`chess-blitz-${key}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('[Integration] Failed to save game state:', error);
      return false;
    }
  }

  async loadGameState<T>(key: string): Promise<T | null> {
    try {
      const data = localStorage.getItem(`chess-blitz-${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('[Integration] Failed to load game state:', error);
      return null;
    }
  }

  async deleteGameState(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(`chess-blitz-${key}`);
      return true;
    } catch (error) {
      console.warn('[Integration] Failed to delete game state:', error);
      return false;
    }
  }

  // ==============================================
  // Leaderboards (mock data for dev)
  // ==============================================

  async submitScore(score: number, metadata?: Record<string, unknown>): Promise<boolean> {
    console.log('[Integration] Score submitted (dev mode):', score, metadata);
    return true;
  }

  async getLeaderboard(_options?: LeaderboardOptions): Promise<LeaderboardEntry[]> {
    // Return mock data for dev mode
    return [
      { rank: 1, playerId: 'player1', score: 2500, displayName: 'ChessMaster' },
      { rank: 2, playerId: 'player2', score: 2400, displayName: 'ProGamer' },
      { rank: 3, playerId: 'player3', score: 2300, displayName: 'QueenSlayer' },
    ];
  }

  // ==============================================
  // Ads (console logging for dev)
  // ==============================================

  async showInterstitialAd(): Promise<boolean> {
    console.log('[Integration] Interstitial ad shown (dev mode)');
    return true;
  }

  async showRewardedAd(onComplete: () => void): Promise<boolean> {
    console.log('[Integration] Rewarded ad shown (dev mode)');
    // Simulate ad completion after 1 second
    setTimeout(onComplete, 1000);
    return true;
  }

  isRewardedAdReady(): boolean {
    return true;
  }

  // ==============================================
  // Sharing (Web Share API fallback)
  // ==============================================

  async share(options?: ShareOptions): Promise<boolean> {
    const shareData = {
      title: options?.title ?? 'Chess Blitz',
      text: options?.text ?? 'I just played Chess Blitz!',
      url: options?.url ?? window.location.href,
    };

    // Use native Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        // User cancelled or share failed
        console.log('[Integration] Share cancelled or failed:', error);
        return false;
      }
    }

    // Fallback: log to console
    console.log('[Integration] Share (dev mode):', shareData);
    return true;
  }
}
