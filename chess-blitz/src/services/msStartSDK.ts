// ==============================================
// Chess Blitz - MSN Start Games SDK Wrapper
// ==============================================

/**
 * MSN Start Games SDK wrapper with fallbacks for development mode.
 * This service provides a unified interface to the MSN Start Games platform.
 */

// Type definitions for MSN Start SDK
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

// Get MSN SDK instance
function getMSStartSDK(): MSStartSDK | null {
  if (typeof window === 'undefined') return null;
  return window.$msstart ?? null;
}

// Check if running in MSN Start environment
export function isInMSNEnvironment(): boolean {
  const sdk = getMSStartSDK();
  try {
    return sdk?.isInMsStartGame?.() ?? false;
  } catch {
    return false;
  }
}

// Get user's locale
export function getLocale(): string {
  const sdk = getMSStartSDK();
  try {
    return sdk?.getLocale?.() ?? navigator.language ?? 'en-US';
  } catch {
    return 'en-US';
  }
}

// Get entry point (how the user launched the game)
export function getEntryPoint(): string {
  const sdk = getMSStartSDK();
  try {
    return sdk?.getEntryPoint?.() ?? 'direct';
  } catch {
    return 'direct';
  }
}

// Get player ID
export async function getPlayerId(): Promise<string | null> {
  const sdk = getMSStartSDK();
  if (!sdk) {
    // Dev mode: generate a random ID
    const devId = localStorage.getItem('chess-blitz-dev-player-id');
    if (devId) return devId;
    const newId = `dev-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('chess-blitz-dev-player-id', newId);
    return newId;
  }

  try {
    return await sdk.getPlayerId();
  } catch (error) {
    console.warn('Failed to get player ID:', error);
    return null;
  }
}

// Cloud Saves
export async function saveGameState(key: string, data: unknown): Promise<boolean> {
  const sdk = getMSStartSDK();
  if (!sdk) {
    // Dev mode: use localStorage
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
    console.warn('Failed to save game state:', error);
    return false;
  }
}

export async function loadGameState<T>(key: string): Promise<T | null> {
  const sdk = getMSStartSDK();
  if (!sdk) {
    // Dev mode: use localStorage
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
    console.warn('Failed to load game state:', error);
    return null;
  }
}

export async function deleteGameState(key: string): Promise<boolean> {
  const sdk = getMSStartSDK();
  if (!sdk) {
    // Dev mode: use localStorage
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
    console.warn('Failed to delete game state:', error);
    return false;
  }
}

// Audio
export function isAudioMuted(): boolean {
  const sdk = getMSStartSDK();
  try {
    return sdk?.getAudioMuted?.() ?? false;
  } catch {
    return false;
  }
}

export function onAudioMuteChange(callback: (muted: boolean) => void): void {
  const sdk = getMSStartSDK();
  try {
    sdk?.onAudioMuteChange?.(callback);
  } catch (error) {
    console.warn('Failed to subscribe to audio mute changes:', error);
  }
}

// Leaderboards
export async function submitScore(score: number, metadata?: Record<string, unknown>): Promise<boolean> {
  const sdk = getMSStartSDK();
  if (!sdk) {
    console.log('[Dev] Score submitted:', score, metadata);
    return true;
  }

  try {
    await sdk.submitScore(score, metadata);
    return true;
  } catch (error) {
    console.warn('Failed to submit score:', error);
    return false;
  }
}

export async function getLeaderboard(options?: LeaderboardOptions): Promise<LeaderboardEntry[]> {
  const sdk = getMSStartSDK();
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
    console.warn('Failed to get leaderboard:', error);
    return [];
  }
}

// Ads
class AdManager {
  private interstitialReady = false;
  private rewardedReady = false;
  private rewardedCallback: (() => void) | null = null;
  private gamesSinceLastAd = 0;

  async loadInterstitialAd(): Promise<void> {
    const sdk = getMSStartSDK();
    if (!sdk) {
      this.interstitialReady = true;
      return;
    }

    try {
      await sdk.loadInterstitialAd();
      this.interstitialReady = true;
    } catch (error) {
      console.warn('Failed to load interstitial ad:', error);
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    // Show every 3rd game
    this.gamesSinceLastAd++;
    if (this.gamesSinceLastAd < 3) {
      return false;
    }

    const sdk = getMSStartSDK();
    if (!sdk) {
      console.log('[Dev] Showing interstitial ad');
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
      console.warn('Failed to show interstitial ad:', error);
      return false;
    }
  }

  async loadRewardedAd(): Promise<void> {
    const sdk = getMSStartSDK();
    if (!sdk) {
      this.rewardedReady = true;
      return;
    }

    try {
      await sdk.loadRewardedAd();
      this.rewardedReady = true;
    } catch (error) {
      console.warn('Failed to load rewarded ad:', error);
    }
  }

  async showRewardedAd(onComplete: () => void): Promise<boolean> {
    const sdk = getMSStartSDK();
    if (!sdk) {
      console.log('[Dev] Showing rewarded ad');
      setTimeout(onComplete, 1000);
      return true;
    }

    if (!this.rewardedReady) {
      await this.loadRewardedAd();
    }

    this.rewardedCallback = onComplete;
    sdk.onRewardedAdCompleted(() => {
      if (this.rewardedCallback) {
        this.rewardedCallback();
        this.rewardedCallback = null;
      }
    });

    try {
      await sdk.showRewardedAd();
      this.rewardedReady = false;
      this.loadRewardedAd(); // Preload next
      return true;
    } catch (error) {
      console.warn('Failed to show rewarded ad:', error);
      return false;
    }
  }

  isRewardedAdReady(): boolean {
    const sdk = getMSStartSDK();
    if (!sdk) return true;

    try {
      return sdk.isRewardedAdReady();
    } catch {
      return this.rewardedReady;
    }
  }
}

export const adManager = new AdManager();

// Share functionality
export async function shareGame(options?: ShareOptions): Promise<boolean> {
  const sdk = getMSStartSDK();
  const defaultOptions: ShareOptions = {
    title: 'Chess Blitz',
    text: 'I just played Chess Blitz! Can you beat my score?',
    url: window.location.href,
    ...options,
  };

  if (!sdk) {
    // Dev mode: use native Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share(defaultOptions);
        return true;
      } catch {
        return false;
      }
    }
    console.log('[Dev] Share:', defaultOptions);
    return true;
  }

  try {
    await sdk.share(defaultOptions);
    return true;
  } catch (error) {
    console.warn('Failed to share:', error);
    return false;
  }
}

// Initialize SDK
export function initializeMSNSDK(): void {
  if (typeof window === 'undefined') return;

  // Preload ads
  adManager.loadInterstitialAd();
  adManager.loadRewardedAd();

  // Log environment info
  console.log('[Chess Blitz] MSN Environment:', isInMSNEnvironment());
  console.log('[Chess Blitz] Locale:', getLocale());
  console.log('[Chess Blitz] Entry Point:', getEntryPoint());
}
