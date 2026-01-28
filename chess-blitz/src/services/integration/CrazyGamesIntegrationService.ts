// ==============================================
// Chess Blitz - CrazyGames Integration Service
// Implementation for CrazyGames platform
// ==============================================

import {
  IntegrationType,
  type AudioState,
  type LeaderboardEntry,
  type LeaderboardOptions,
  type ShareOptions,
} from '@/types/integration';
import type { IIntegrationService, IntegrationCapabilities } from './types';
import { soundManager } from '@/services/soundManager';

/**
 * Get CrazyGames SDK instance from window
 */
function getCrazyGamesSDK(): CrazyGamesSDK | null {
  return window.CrazyGames?.SDK ?? null;
}

/**
 * CrazyGames platform integration service
 *
 * INITIALIZATION PATTERN:
 * - Uses a single Promise for initialization (idempotent)
 * - Async methods await initialize() automatically
 * - Sync methods (lifecycle) check this.ready flag - caller must ensure init completed
 */
type CrazyGamesSettings = { muteAudio: boolean; disableChat: boolean };

export class CrazyGamesIntegrationService implements IIntegrationService {
  readonly type = IntegrationType.CrazyGames;
  readonly capabilities: IntegrationCapabilities = {
    hasAudio: true,
    hasAds: true,
    hasLeaderboards: false,
    hasCloudSaves: true,
    hasSharing: false,
    hasGameLifecycle: true,
    hasMultiplayer: true,
  };

  // Initialization state
  private initPromise: Promise<void> | null = null;
  private ready = false;

  // Runtime state
  private adPlaying = false;
  private platformMuted = false;
  private settingsListener: ((settings: CrazyGamesSettings) => void) | null = null;
  private audioStateCallbacks: Set<(state: AudioState) => void> = new Set();

  // ==============================================
  // Lifecycle - Initialization Promise Pattern
  // ==============================================

  /**
   * Initialize the SDK. Idempotent - multiple calls return same Promise.
   * All async methods await this automatically.
   */
  async initialize(): Promise<void> {
    // Return existing Promise if already initializing/initialized
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const sdk = getCrazyGamesSDK();

    if (sdk) {
      try {
        // CrazyGames SDK requires explicit initialization
        await sdk.init();
        console.log('[CrazyGames] SDK initialized');
        console.log('[CrazyGames] Environment:', sdk.environment);

        // Apply initial audio setting from platform
        if (sdk.game.settings?.muteAudio) {
          this.platformMuted = true;
          soundManager.setMuted(true);
          console.log('[CrazyGames] Initial audio: muted (platform setting)');
        }

        // Listen for settings changes (mute toggle in CrazyGames UI)
        this.settingsListener = (settings: CrazyGamesSettings) => {
          console.log('[CrazyGames] Settings changed:', settings);
          this.platformMuted = settings.muteAudio;
          soundManager.setMuted(this.platformMuted || this.adPlaying);
          this.notifyAudioStateChange();
        };
        sdk.game.addSettingsChangeListener(this.settingsListener);
      } catch (error) {
        console.error('[CrazyGames] Failed to initialize SDK:', error);
      }
    } else {
      console.log('[CrazyGames] SDK not available, using fallbacks');
    }

    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Check if running in CrazyGames environment.
   * Sync method - only valid after initialization.
   */
  isInPlatformEnvironment(): boolean {
    if (!this.ready) return false;

    const sdk = getCrazyGamesSDK();
    if (!sdk) return false;

    try {
      return sdk.environment === 'crazygames';
    } catch (error) {
      console.warn('[CrazyGames] Failed to check environment:', error);
      return false;
    }
  }

  // ==============================================
  // Audio Control
  // ==============================================

  getAudioState(): AudioState {
    return { isMuted: this.platformMuted || this.adPlaying };
  }

  onAudioStateChange(callback: (state: AudioState) => void): () => void {
    this.audioStateCallbacks.add(callback);
    return () => {
      this.audioStateCallbacks.delete(callback);
    };
  }

  private notifyAudioStateChange(): void {
    const state = this.getAudioState();
    for (const callback of this.audioStateCallbacks) {
      callback(state);
    }
  }

  private muteForAd(): void {
    this.adPlaying = true;
    soundManager.setMuted(true);
    this.notifyAudioStateChange();
  }

  private unmuteAfterAd(): void {
    this.adPlaying = false;
    soundManager.setMuted(this.platformMuted);
    this.notifyAudioStateChange();
  }

  // ==============================================
  // Identity
  // ==============================================

  /**
   * Check if user account features are available.
   * Sync method - only valid after initialization.
   */
  isUserAccountAvailable(): boolean {
    if (!this.ready) return false;

    const sdk = getCrazyGamesSDK();
    if (!sdk) return false;

    try {
      if (sdk.environment === 'disabled') return false;
      return sdk.user.isUserAccountAvailable;
    } catch (error) {
      console.warn('[CrazyGames] Failed to check isUserAccountAvailable:', error);
      return false;
    }
  }

  private getDevPlayerId(): string {
    const devId = localStorage.getItem('chess-blitz-dev-player-id');
    if (devId) return devId;
    const newId = `dev-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('chess-blitz-dev-player-id', newId);
    return newId;
  }

  /**
   * Get unique user ID from platform.
   * Async method - automatically awaits initialization.
   */
  async getUserId(): Promise<string | null> {
    await this.initialize();

    const sdk = getCrazyGamesSDK();
    if (!sdk) return this.getDevPlayerId();

    try {
      if (sdk.environment === 'disabled') {
        return this.getDevPlayerId();
      }

      if (!sdk.user.isUserAccountAvailable) {
        console.log('[CrazyGames] User account not available');
        return null;
      }

      const token = await sdk.user.getUserToken();
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('[CrazyGames] User ID:', payload.userId);
      return payload.userId;
    } catch (error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'userNotAuthenticated') {
        console.log('[CrazyGames] User not authenticated (guest)');
        return null;
      }
      console.warn('[CrazyGames] Failed to get user token:', error);
      return null;
    }
  }

  /**
   * Get platform auth token for backend verification.
   * Async method - automatically awaits initialization.
   */
  async getPlatformToken(): Promise<string | null> {
    await this.initialize();

    const sdk = getCrazyGamesSDK();
    if (!sdk) return null;

    try {
      if (sdk.environment === 'disabled') return null;
      if (!sdk.user.isUserAccountAvailable) return null;

      return await sdk.user.getUserToken();
    } catch (error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'userNotAuthenticated') {
        return null;
      }
      console.warn('[CrazyGames] Failed to get platform token:', error);
      return null;
    }
  }

  /** @deprecated Use getUserId() instead */
  async getPlayerId(): Promise<string | null> {
    return this.getUserId();
  }

  /**
   * Get user info (username, avatar).
   * Async method - automatically awaits initialization.
   */
  async getUser(): Promise<{ username: string; avatarUrl?: string } | null> {
    await this.initialize();

    const sdk = getCrazyGamesSDK();
    if (!sdk) return null;

    try {
      if (sdk.environment === 'disabled') return null;

      const user = await sdk.user.getUser();
      if (user) {
        return {
          username: user.username,
          avatarUrl: user.profilePictureUrl,
        };
      }
      return null;
    } catch (error) {
      console.warn('[CrazyGames] Failed to get user:', error);
      return null;
    }
  }

  /**
   * Subscribe to auth state changes.
   * Sync method - only valid after initialization.
   */
  onAuthStateChange(
    callback: (user: { username: string; avatarUrl?: string } | null) => void
  ): () => void {
    if (!this.ready) {
      return () => {};
    }

    const sdk = getCrazyGamesSDK();
    if (!sdk) return () => {};

    try {
      if (sdk.environment === 'disabled') {
        return () => {};
      }

      const listener = (
        cgUser: { username: string; profilePictureUrl: string } | null
      ) => {
        console.log('[CrazyGames] Auth state changed:', cgUser?.username ?? 'logged out');
        callback(
          cgUser
            ? { username: cgUser.username, avatarUrl: cgUser.profilePictureUrl }
            : null
        );
      };

      sdk.user.addAuthListener(listener);
      return () => {
        sdk.user.removeAuthListener(listener);
      };
    } catch (error) {
      console.warn('[CrazyGames] Failed to add auth listener:', error);
      return () => {};
    }
  }

  /**
   * Show login prompt.
   * Async method - automatically awaits initialization.
   */
  async showAuthPrompt(): Promise<{ username: string; avatarUrl?: string } | null> {
    await this.initialize();

    const sdk = getCrazyGamesSDK();
    if (!sdk) return null;

    try {
      if (sdk.environment === 'disabled') {
        console.log('[CrazyGames] Auth prompt not available in dev mode');
        return null;
      }

      const user = await sdk.user.showAuthPrompt();
      return {
        username: user.username,
        avatarUrl: user.profilePictureUrl,
      };
    } catch (error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'userCancelled') {
        console.log('[CrazyGames] User cancelled auth prompt');
        return null;
      }
      if (errorCode === 'userAlreadySignedIn') {
        return this.getUser();
      }
      console.warn('[CrazyGames] Auth prompt error:', error);
      return null;
    }
  }

  // ==============================================
  // Cloud Saves
  // ==============================================

  /**
   * Save game state to cloud.
   * Async method - automatically awaits initialization.
   */
  async saveGameState(key: string, data: unknown): Promise<boolean> {
    await this.initialize();

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') {
      // Dev mode: use localStorage
      try {
        localStorage.setItem(`chess-blitz-${key}`, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    }

    try {
      sdk.data.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('[CrazyGames] Failed to save game state:', error);
      return false;
    }
  }

  /**
   * Load game state from cloud.
   * Async method - automatically awaits initialization.
   */
  async loadGameState<T>(key: string): Promise<T | null> {
    await this.initialize();

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') {
      // Dev mode: use localStorage
      try {
        const data = localStorage.getItem(`chess-blitz-${key}`);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    }

    try {
      const data = sdk.data.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('[CrazyGames] Failed to load game state:', error);
      return null;
    }
  }

  /**
   * Delete game state from cloud.
   * Async method - automatically awaits initialization.
   */
  async deleteGameState(key: string): Promise<boolean> {
    await this.initialize();

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') {
      try {
        localStorage.removeItem(`chess-blitz-${key}`);
        return true;
      } catch {
        return false;
      }
    }

    try {
      sdk.data.removeItem(key);
      return true;
    } catch (error) {
      console.warn('[CrazyGames] Failed to delete game state:', error);
      return false;
    }
  }

  // ==============================================
  // Leaderboards (Not supported)
  // ==============================================

  async submitScore(_score: number, _metadata?: Record<string, unknown>): Promise<boolean> {
    return false;
  }

  async getLeaderboard(_options?: LeaderboardOptions): Promise<LeaderboardEntry[]> {
    return [];
  }

  // ==============================================
  // Ads
  // ==============================================

  /**
   * Show interstitial ad.
   * Async method - automatically awaits initialization.
   */
  async showInterstitialAd(): Promise<boolean> {
    await this.initialize();

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') {
      console.log('[CrazyGames] Interstitial ad shown (dev mode)');
      return true;
    }

    return new Promise((resolve) => {
      sdk.ad.requestAd('midgame', {
        adStarted: () => {
          this.muteForAd();
        },
        adFinished: () => {
          this.unmuteAfterAd();
          resolve(true);
        },
        adError: (error: { code: string; message: string }) => {
          console.warn('[CrazyGames] Ad error:', error);
          this.unmuteAfterAd();
          resolve(false);
        },
      });
    });
  }

  /**
   * Show rewarded ad.
   * Async method - automatically awaits initialization.
   */
  async showRewardedAd(onComplete: () => void): Promise<boolean> {
    await this.initialize();

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') {
      console.log('[CrazyGames] Rewarded ad shown (dev mode)');
      setTimeout(onComplete, 1000);
      return true;
    }

    return new Promise((resolve) => {
      sdk.ad.requestAd('rewarded', {
        adStarted: () => {
          this.muteForAd();
        },
        adFinished: () => {
          this.unmuteAfterAd();
          onComplete();
          resolve(true);
        },
        adError: (error: { code: string; message: string }) => {
          console.warn('[CrazyGames] Rewarded ad error:', error);
          this.unmuteAfterAd();
          resolve(false);
        },
      });
    });
  }

  /**
   * Check if rewarded ad is ready.
   * Sync method - only valid after initialization.
   */
  isRewardedAdReady(): boolean {
    if (!this.ready) return false;

    const sdk = getCrazyGamesSDK();
    if (!sdk) return false;

    try {
      return sdk.environment !== 'disabled';
    } catch {
      return false;
    }
  }

  // ==============================================
  // Sharing (Not supported)
  // ==============================================

  async share(_options?: ShareOptions): Promise<boolean> {
    return false;
  }

  // ==============================================
  // Game Lifecycle
  // Sync methods - caller must ensure initialization completed
  // ==============================================

  gameplayStart(): void {
    if (!this.ready) return;

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') return;

    try {
      sdk.game.gameplayStart();
    } catch (error) {
      console.warn('[CrazyGames] Failed to call gameplayStart:', error);
    }
  }

  gameplayStop(): void {
    if (!this.ready) return;

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') return;

    try {
      sdk.game.gameplayStop();
    } catch (error) {
      console.warn('[CrazyGames] Failed to call gameplayStop:', error);
    }
  }

  loadingStart(): void {
    if (!this.ready) return;

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') return;

    try {
      sdk.game.loadingStart();
    } catch (error) {
      console.warn('[CrazyGames] Failed to call loadingStart:', error);
    }
  }

  loadingStop(): void {
    if (!this.ready) return;

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') return;

    try {
      sdk.game.loadingStop();
    } catch (error) {
      console.warn('[CrazyGames] Failed to call loadingStop:', error);
    }
  }

  happyTime(): void {
    if (!this.ready) return;

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') return;

    try {
      sdk.game.happyTime();
    } catch (error) {
      console.warn('[CrazyGames] Failed to call happyTime:', error);
    }
  }

  // ==============================================
  // Multiplayer
  // Sync methods - only valid after initialization
  // ==============================================

  isInstantMultiplayer(): boolean {
    if (!this.ready) return false;

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') return false;

    try {
      return sdk.game.isInstantMultiplayer;
    } catch (error) {
      console.warn('[CrazyGames] Failed to check isInstantMultiplayer:', error);
      return false;
    }
  }

  getInviteRoomId(): string | null {
    if (!this.ready) return null;

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') return null;

    try {
      return sdk.game.getInviteParam('roomId');
    } catch (error) {
      console.warn('[CrazyGames] Failed to get invite roomId:', error);
      return null;
    }
  }

  showInviteButton(roomId: string): string | null {
    if (!this.ready) return null;

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') {
      console.log('[CrazyGames] showInviteButton:', roomId, '(dev mode)');
      return null;
    }

    try {
      const link = sdk.game.showInviteButton({ roomId });
      console.log('[CrazyGames] Invite button shown for room:', roomId);
      return link;
    } catch (error) {
      console.warn('[CrazyGames] Failed to show invite button:', error);
      return null;
    }
  }

  hideInviteButton(): void {
    if (!this.ready) return;

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') return;

    try {
      sdk.game.hideInviteButton();
      console.log('[CrazyGames] Invite button hidden');
    } catch (error) {
      console.warn('[CrazyGames] Failed to hide invite button:', error);
    }
  }

  getInviteLink(roomId: string): string | null {
    if (!this.ready) {
      // Fallback for pre-init calls
      return `${window.location.origin}?inviteRoomId=${roomId}`;
    }

    const sdk = getCrazyGamesSDK();
    if (!sdk || sdk.environment === 'disabled') {
      return `${window.location.origin}?inviteRoomId=${roomId}`;
    }

    try {
      return sdk.game.inviteLink({ roomId });
    } catch (error) {
      console.warn('[CrazyGames] Failed to generate invite link:', error);
      return null;
    }
  }
}
