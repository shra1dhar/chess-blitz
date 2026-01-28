// ==============================================
// Chess Blitz - MSN Integration Service
// Implementation for MSN Start Games platform
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
 * Get MSN SDK instance from window
 */
function getMSNSDK(): MSNStartSDK | null {
  return window.$msstart ?? null;
}

/**
 * MSN Start Games integration service
 * Provides full platform integration including audio sync, ads, leaderboards, and cloud saves
 */
export class MsnIntegrationService implements IIntegrationService {
  readonly type = IntegrationType.Msn;
  readonly capabilities: IntegrationCapabilities = {
    hasAudio: true,
    hasAds: true,
    hasLeaderboards: true,
    hasCloudSaves: true,
    hasSharing: true,
    hasGameLifecycle: false,
    hasMultiplayer: false,
  };

  private ready = false;
  private interstitialReady = false;
  private rewardedReady = false;
  private rewardedCallback: (() => void) | null = null;
  private gamesSinceLastAd = 0;

  // ==============================================
  // Lifecycle
  // ==============================================

  async initialize(): Promise<void> {
    const sdk = getMSNSDK();

    if (sdk) {
      // Set up rewarded ad completion callback
      try {
        sdk.onRewardedAdCompleted(() => {
          if (this.rewardedCallback) {
            this.rewardedCallback();
            this.rewardedCallback = null;
          }
        });
      } catch (error) {
        console.warn('[MSN] Failed to set up rewarded ad callback:', error);
      }

      // Preload ads
      this.loadInterstitialAd();
      this.loadRewardedAd();

      console.log('[MSN] Integration initialized');
      console.log('[MSN] Environment:', this.isInPlatformEnvironment());
      console.log('[MSN] Locale:', this.getLocale());
      console.log('[MSN] Entry Point:', this.getEntryPoint());
    } else {
      console.log('[MSN] SDK not available, using fallbacks');
    }

    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  isInPlatformEnvironment(): boolean {
    const sdk = getMSNSDK();
    try {
      return sdk?.isInMsStartGame?.() ?? false;
    } catch {
      return false;
    }
  }

  // ==============================================
  // MSN-specific helpers
  // ==============================================

  private getLocale(): string {
    const sdk = getMSNSDK();
    try {
      return sdk?.getLocale?.() ?? navigator.language ?? 'en-US';
    } catch {
      return 'en-US';
    }
  }

  private getEntryPoint(): string {
    const sdk = getMSNSDK();
    try {
      return sdk?.getEntryPoint?.() ?? 'direct';
    } catch {
      return 'direct';
    }
  }

  // ==============================================
  // Audio Control
  // ==============================================

  getAudioState(): AudioState {
    const sdk = getMSNSDK();
    try {
      return { isMuted: sdk?.getAudioMuted?.() ?? false };
    } catch {
      return { isMuted: false };
    }
  }

  onAudioStateChange(callback: (state: AudioState) => void): () => void {
    const sdk = getMSNSDK();
    if (!sdk) return () => {};

    try {
      sdk.onAudioMuteChange((muted: boolean) => {
        callback({ isMuted: muted });
      });
    } catch (error) {
      console.warn('[MSN] Failed to subscribe to audio mute changes:', error);
    }

    // MSN SDK doesn't provide unsubscribe, return no-op
    return () => {};
  }

  // ==============================================
  // Identity
  // ==============================================

  /**
   * Check if user account features are available
   * MSN doesn't have a user account system like CrazyGames
   */
  isUserAccountAvailable(): boolean {
    return false;
  }

  /**
   * Get unique user ID from platform
   * MSN uses getPlayerId() directly (no token-based auth)
   */
  async getUserId(): Promise<string | null> {
    return this.getPlayerId();
  }

  /**
   * Get platform-specific auth token
   * MSN doesn't have a token-based auth system
   */
  async getPlatformToken(): Promise<string | null> {
    return null;
  }

  async getPlayerId(): Promise<string | null> {
    const sdk = getMSNSDK();
    if (!sdk) {
      // Fallback: generate dev ID
      const devId = localStorage.getItem('chess-blitz-dev-player-id');
      if (devId) return devId;
      const newId = `dev-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('chess-blitz-dev-player-id', newId);
      return newId;
    }

    try {
      return await sdk.getPlayerId();
    } catch (error) {
      console.warn('[MSN] Failed to get player ID:', error);
      return null;
    }
  }

  async getUser(): Promise<{ username: string; avatarUrl?: string } | null> {
    // MSN doesn't have a user module with username/avatar
    return null;
  }

  /**
   * Subscribe to auth state changes
   * MSN doesn't have auth events, return no-op
   */
  onAuthStateChange(
    _callback: (user: { username: string; avatarUrl?: string } | null) => void
  ): () => void {
    return () => {};
  }

  // ==============================================
  // Cloud Saves
  // ==============================================

  async saveGameState(key: string, data: unknown): Promise<boolean> {
    const sdk = getMSNSDK();
    if (!sdk) {
      try {
        localStorage.setItem(`chess-blitz-${key}`, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }

    try {
      await sdk.saveGameState(key, data);
      return true;
    } catch (error) {
      console.warn('[MSN] Failed to save game state:', error);
      return false;
    }
  }

  async loadGameState<T>(key: string): Promise<T | null> {
    const sdk = getMSNSDK();
    if (!sdk) {
      try {
        const data = localStorage.getItem(`chess-blitz-${key}`);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    }

    try {
      const data = await sdk.loadGameState(key);
      return data as T;
    } catch (error) {
      console.warn('[MSN] Failed to load game state:', error);
      return null;
    }
  }

  async deleteGameState(key: string): Promise<boolean> {
    const sdk = getMSNSDK();
    if (!sdk) {
      try {
        localStorage.removeItem(`chess-blitz-${key}`);
        return true;
      } catch {
        return false;
      }
    }

    try {
      await sdk.deleteGameState(key);
      return true;
    } catch (error) {
      console.warn('[MSN] Failed to delete game state:', error);
      return false;
    }
  }

  // ==============================================
  // Leaderboards
  // ==============================================

  async submitScore(score: number, metadata?: Record<string, unknown>): Promise<boolean> {
    const sdk = getMSNSDK();
    if (!sdk) {
      console.log('[MSN] Score submitted (dev mode):', score, metadata);
      return true;
    }

    try {
      await sdk.submitScore(score, metadata);
      return true;
    } catch (error) {
      console.warn('[MSN] Failed to submit score:', error);
      return false;
    }
  }

  async getLeaderboard(options?: LeaderboardOptions): Promise<LeaderboardEntry[]> {
    const sdk = getMSNSDK();
    if (!sdk) {
      // Dev mode: return mock data
      return [
        { rank: 1, playerId: 'player1', score: 2500, displayName: 'ChessMaster' },
        { rank: 2, playerId: 'player2', score: 2400, displayName: 'ProGamer' },
        { rank: 3, playerId: 'player3', score: 2300, displayName: 'QueenSlayer' },
      ];
    }

    try {
      return await sdk.getLeaderboard(options);
    } catch (error) {
      console.warn('[MSN] Failed to get leaderboard:', error);
      return [];
    }
  }

  // ==============================================
  // Ads
  // ==============================================

  private async loadInterstitialAd(): Promise<void> {
    const sdk = getMSNSDK();
    if (!sdk) {
      this.interstitialReady = true;
      return;
    }

    try {
      await sdk.loadInterstitialAd();
      this.interstitialReady = true;
    } catch (error) {
      console.warn('[MSN] Failed to load interstitial ad:', error);
    }
  }

  private async loadRewardedAd(): Promise<void> {
    const sdk = getMSNSDK();
    if (!sdk) {
      this.rewardedReady = true;
      return;
    }

    try {
      await sdk.loadRewardedAd();
      this.rewardedReady = true;
    } catch (error) {
      console.warn('[MSN] Failed to load rewarded ad:', error);
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    // Show every 3rd game
    this.gamesSinceLastAd++;
    if (this.gamesSinceLastAd < 3) {
      return false;
    }

    const sdk = getMSNSDK();
    if (!sdk) {
      console.log('[MSN] Interstitial ad shown (dev mode)');
      this.gamesSinceLastAd = 0;
      return true;
    }

    if (!this.interstitialReady) {
      await this.loadInterstitialAd();
    }

    try {
      await sdk.showInterstitialAd();
      this.gamesSinceLastAd = 0;
      this.interstitialReady = false;
      this.loadInterstitialAd(); // Preload next
      return true;
    } catch (error) {
      console.warn('[MSN] Failed to show interstitial ad:', error);
      return false;
    }
  }

  async showRewardedAd(onComplete: () => void): Promise<boolean> {
    const sdk = getMSNSDK();
    if (!sdk) {
      console.log('[MSN] Rewarded ad shown (dev mode)');
      setTimeout(onComplete, 1000);
      return true;
    }

    if (!this.rewardedReady) {
      await this.loadRewardedAd();
    }

    this.rewardedCallback = onComplete;

    try {
      await sdk.showRewardedAd();
      this.rewardedReady = false;
      this.loadRewardedAd(); // Preload next
      return true;
    } catch (error) {
      console.warn('[MSN] Failed to show rewarded ad:', error);
      this.rewardedCallback = null;
      return false;
    }
  }

  isRewardedAdReady(): boolean {
    const sdk = getMSNSDK();
    if (!sdk) return true;

    try {
      return sdk.isRewardedAdReady();
    } catch {
      return this.rewardedReady;
    }
  }

  // ==============================================
  // Sharing
  // ==============================================

  async share(options?: ShareOptions): Promise<boolean> {
    const sdk = getMSNSDK();
    const shareOptions: ShareOptions = {
      title: options?.title ?? 'Chess Blitz',
      text: options?.text ?? 'I just played Chess Blitz! Can you beat my score?',
      url: options?.url ?? window.location.href,
    };

    if (!sdk) {
      // Fallback: use native Web Share API
      if (navigator.share) {
        try {
          await navigator.share(shareOptions);
          return true;
        } catch {
          return false;
        }
      }
      console.log('[MSN] Share (dev mode):', shareOptions);
      return true;
    }

    try {
      await sdk.share(shareOptions);
      return true;
    } catch (error) {
      console.warn('[MSN] Failed to share:', error);
      return false;
    }
  }
}
