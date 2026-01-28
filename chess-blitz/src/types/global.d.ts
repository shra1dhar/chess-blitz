// ==============================================
// Chess Blitz - Global Type Declarations
// ==============================================

declare global {
  /**
   * MSN Start Games SDK interface
   */
  interface MSNStartSDK {
    isInMsStartGame: () => boolean;
    getLocale: () => string;
    getEntryPoint: () => string;
    ping: () => Promise<void>;
    share: (options: { title?: string; text?: string; url?: string }) => Promise<void>;

    // User Identity
    getPlayerId: () => Promise<string | null>;
    getConsentString: () => Promise<string | null>;

    // Leaderboards
    submitScore: (score: number, metadata?: Record<string, unknown>) => Promise<void>;
    getLeaderboard: (options?: {
      period?: 'daily' | 'weekly' | 'monthly' | 'allTime';
      count?: number;
    }) => Promise<Array<{
      rank: number;
      playerId: string;
      score: number;
      displayName?: string;
    }>>;
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

  /**
   * CrazyGames SDK interface
   * @see https://docs.crazygames.com/sdk/intro/
   */
  interface CrazyGamesSDK {
    init(): Promise<void>;
    environment: 'local' | 'crazygames' | 'disabled';

    game: {
      settings: {
        muteAudio: boolean;
        disableChat: boolean;
      };
      addSettingsChangeListener(
        callback: (settings: { muteAudio: boolean; disableChat: boolean }) => void
      ): void;
      removeSettingsChangeListener(
        callback: (settings: { muteAudio: boolean; disableChat: boolean }) => void
      ): void;
      gameplayStart(): void;
      gameplayStop(): void;
      loadingStart(): void;
      loadingStop(): void;
      happyTime(): void;

      /** True when user clicked "Play with Friends" in CrazyGames UI */
      isInstantMultiplayer: boolean;

      /**
       * Show the native CrazyGames invite button
       * Triggers friend notifications in the platform
       * @param options.roomId - Your game's room identifier
       * @returns The invite link that will be used
       */
      showInviteButton(options: { roomId: string | number }): string;

      /** Hide the invite button (call when room is full or game starts) */
      hideInviteButton(): void;

      /**
       * Generate an invite link without showing the button
       * @param options.roomId - Your game's room identifier
       * @param options.region - Optional region parameter
       * @returns The generated invite link
       */
      inviteLink(options: { roomId: string | number; region?: string }): string;

      /**
       * Get a parameter from an invite link
       * @param name - Parameter name (e.g., "roomId")
       * @returns The parameter value or null if not present
       */
      getInviteParam(name: string): string | null;
    };

    ad: {
      requestAd(
        type: 'midgame' | 'rewarded',
        callbacks: {
          adStarted?: () => void;
          adFinished?: () => void;
          adError?: (error: { code: string; message: string }) => void;
        }
      ): void;
      hasAdblock(): Promise<boolean>;
    };

    data: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
      clear(): void;
    };

    user: {
      /** Whether user account features are available on this domain */
      isUserAccountAvailable: boolean;

      /** System/device information */
      systemInfo: {
        countryCode: string;
        locale: string;
        device: { type: 'desktop' | 'tablet' | 'mobile' };
        os: { name: string; version: string };
        browser: { name: string; version: string };
        applicationType: 'google_play_store' | 'apple_store' | 'pwa' | 'web';
      };

      /** Get currently logged-in user (null if guest) */
      getUser(): Promise<{ username: string; profilePictureUrl: string } | null>;

      /**
       * Get JWT token for backend authentication
       * Contains: userId, gameId, username, profilePictureUrl, iat, exp
       * Lifetime: 1 hour, automatically refreshed
       * @throws {code: 'userNotAuthenticated'} if user is not logged in
       * @throws {code: 'unexpectedError'} on SDK errors
       */
      getUserToken(): Promise<string>;

      /**
       * Show login/registration modal
       * @throws {code: 'showAuthPromptInProgress'} if modal already open
       * @throws {code: 'userAlreadySignedIn'} if user already logged in
       * @throws {code: 'userCancelled'} if user closes modal
       */
      showAuthPrompt(): Promise<{ username: string; profilePictureUrl: string }>;

      /** Listen for authentication changes (login/logout) */
      addAuthListener(
        callback: (user: { username: string; profilePictureUrl: string } | null) => void
      ): void;

      /** Remove authentication listener */
      removeAuthListener(
        callback: (user: { username: string; profilePictureUrl: string } | null) => void
      ): void;

      /**
       * Show account linking modal
       * @throws {code: 'showAccountLinkPromptInProgress'} if modal already open
       * @throws {code: 'userNotAuthenticated'} if user not logged in
       */
      showAccountLinkPrompt(): Promise<{ response: 'yes' | 'no' }>;
    };
  }

  /**
   * Extend Window interface to include platform SDKs
   */
  interface Window {
    $msstart?: MSNStartSDK;
    CrazyGames?: { SDK: CrazyGamesSDK };
  }
}

export {};
