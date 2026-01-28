'use client';

// ==============================================
// Chess Blitz - Integration Provider Client
// Handles app-wide side effects and initialization
// SDK script is loaded by the server component
// ==============================================

import { useEffect, useRef } from 'react';
import { soundManager } from '@/services/soundManager';
import { initStockfish } from '@/services/stockfishService';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useIntegrationStore } from '@/stores/integrationStore';
import { IntegrationType } from '@/types/integration';
import { getIntegrationService } from '@/services/integration';
import {
  loadSettingsFromCloud,
  syncSettingsToCloud,
  loadEloFromCloud,
  syncEloToCloud,
  cancelPendingSyncs,
} from '@/services/integration/cloudSync';

interface IntegrationProviderClientProps {
  integrationType: IntegrationType;
}

/**
 * Client component that handles:
 * - Setting integration type in store (SDK loaded by server component)
 * - Zustand store rehydration
 * - Sound manager initialization
 * - Auth session initialization
 * - Stockfish preloading
 * - Cloud sync for settings and ELO
 */
export function IntegrationProviderClient({
  integrationType,
}: IntegrationProviderClientProps) {
  // No window check needed - integrationType comes from server!

  const initializeSession = useMultiplayerStore(
    (state) => state.initializeSession
  );
  const authInitializedRef = useRef(false);
  const cloudSyncInitializedRef = useRef(false);

  const { setIntegrationType: setStoreIntegrationType } = useIntegrationStore();

  // Set integration type in store on mount
  useEffect(() => {
    setStoreIntegrationType(integrationType);
    console.log(`[Integration] Type set to: ${integrationType}`);
  }, [integrationType, setStoreIntegrationType]);

  // Rehydrate Zustand stores after React hydration completes
  useEffect(() => {
    try {
      useSettingsStore.persist.rehydrate();
    } catch (error) {
      console.error('Failed to rehydrate settings store:', error);
    }

    try {
      useMultiplayerStore.persist.rehydrate();
    } catch (error) {
      console.error('Failed to rehydrate multiplayer store:', error);
    }

    // Apply theme from settings after rehydration
    const unsubscribe = useSettingsStore.subscribe((state) => {
      if (state.theme) {
        document.documentElement.setAttribute('data-theme', state.theme);
      }
    });

    // Apply current theme immediately
    const currentTheme = useSettingsStore.getState().theme;
    if (currentTheme) {
      document.documentElement.setAttribute('data-theme', currentTheme);
    }

    return unsubscribe;
  }, []);

  // Initialize sound manager on mount
  useEffect(() => {
    soundManager.init();
  }, []);

  // Initialize auth session in background
  useEffect(() => {
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    initializeSession().catch((error) => {
      console.error('Failed to initialize auth session:', error);
    });
  }, [initializeSession]);

  // Preload Stockfish engine in background
  useEffect(() => {
    initStockfish().catch((error) => {
      console.warn('[IntegrationProvider] Stockfish preload failed:', error);
    });
  }, []);

  // Initialize integration service and cloud sync
  useEffect(() => {
    if (cloudSyncInitializedRef.current) return;
    cloudSyncInitializedRef.current = true;

    async function initCloudSync() {
      // Initialize the integration service (required for CrazyGames SDK)
      const service = getIntegrationService(integrationType);

      // SDK must be initialized first before any other SDK calls
      await service.initialize();

      // Signal loading start (CrazyGames compliance: call when site starts loading)
      // Note: Called after initialize() because CrazyGames SDK v3 requires init() first
      if (service.capabilities.hasGameLifecycle && service.loadingStart) {
        service.loadingStart();
      }

      // Check for CrazyGames multiplayer entry points
      if (service.capabilities.hasMultiplayer) {
        const integrationStore = useIntegrationStore.getState();

        // Check 1: User clicked "Play with Friends" in CrazyGames UI
        if (service.isInstantMultiplayer?.()) {
          console.log('[Integration] Instant multiplayer detected');
          integrationStore.setInstantMultiplayer(true);
        }

        // Check 2: User came from friend's invite link
        const inviteRoomId = service.getInviteRoomId?.();
        if (inviteRoomId) {
          console.log('[Integration] Invite room detected:', inviteRoomId);
          integrationStore.setInviteRoomId(inviteRoomId);
        }
      }

      // Skip cloud sync for platforms without cloud saves
      if (!service.capabilities.hasCloudSaves) {
        // Still signal loading stop before returning
        if (service.capabilities.hasGameLifecycle && service.loadingStop) {
          service.loadingStop();
        }
        return;
      }

      // Load settings from cloud and merge with local
      const cloudSettings = await loadSettingsFromCloud(integrationType);
      if (cloudSettings) {
        const store = useSettingsStore.getState();
        // Cloud settings take precedence
        if (cloudSettings.theme) store.setTheme(cloudSettings.theme);
        if (cloudSettings.pieceSet) store.setPieceSet(cloudSettings.pieceSet);
        if (cloudSettings.soundEnabled !== undefined) store.setSoundEnabled(cloudSettings.soundEnabled);
        if (cloudSettings.animationSpeed) store.setAnimationSpeed(cloudSettings.animationSpeed);
        // Boolean settings - only apply if explicitly set
        if (cloudSettings.showLegalMoves !== undefined && cloudSettings.showLegalMoves !== store.showLegalMoves) {
          store.toggleLegalMoves();
        }
        if (cloudSettings.autoQueen !== undefined && cloudSettings.autoQueen !== store.autoQueen) {
          store.toggleAutoQueen();
        }
        if (cloudSettings.confirmMoves !== undefined && cloudSettings.confirmMoves !== store.confirmMoves) {
          store.toggleConfirmMoves();
        }
        console.log('[IntegrationProvider] Applied cloud settings');
      }

      // Load ELO from cloud and merge with local (after auth is ready)
      const cloudElo = await loadEloFromCloud(integrationType);
      if (cloudElo) {
        const multiplayerStore = useMultiplayerStore.getState();
        // Only update if we have valid ELO values
        const tournamentTypes = ['bullet', 'blitz', 'rapid', 'classical'] as const;
        for (const type of tournamentTypes) {
          if (cloudElo[type] && cloudElo[type] !== multiplayerStore.elo[type]) {
            multiplayerStore.updateElo(type, cloudElo[type]);
          }
        }
        console.log('[IntegrationProvider] Applied cloud ELO');
      }

      // Signal loading stop (CrazyGames compliance: call when app is ready)
      if (service.capabilities.hasGameLifecycle && service.loadingStop) {
        service.loadingStop();
      }
    }

    initCloudSync().catch((error) => {
      console.warn('[IntegrationProvider] Cloud sync initialization failed:', error);
      // Still signal loading stop on error so the game doesn't hang
      const service = getIntegrationService(integrationType);
      if (service.capabilities.hasGameLifecycle && service.loadingStop) {
        service.loadingStop();
      }
    });
  }, [integrationType]);

  // Subscribe to settings changes and sync to cloud
  useEffect(() => {
    const service = getIntegrationService(integrationType);
    if (!service.capabilities.hasCloudSaves) {
      return;
    }

    const unsubscribe = useSettingsStore.subscribe((state) => {
      syncSettingsToCloud(integrationType, {
        theme: state.theme,
        pieceSet: state.pieceSet,
        soundEnabled: state.soundEnabled,
        showLegalMoves: state.showLegalMoves,
        autoQueen: state.autoQueen,
        confirmMoves: state.confirmMoves,
        animationSpeed: state.animationSpeed,
      });
    });

    return unsubscribe;
  }, [integrationType]);

  // Subscribe to ELO changes and sync to cloud
  useEffect(() => {
    const service = getIntegrationService(integrationType);
    if (!service.capabilities.hasCloudSaves) {
      return;
    }

    // Track previous ELO to detect changes
    let prevElo = useMultiplayerStore.getState().elo;

    const unsubscribe = useMultiplayerStore.subscribe((state) => {
      // Only sync if ELO actually changed
      if (state.elo !== prevElo) {
        prevElo = state.elo;
        syncEloToCloud(integrationType, state.elo);
      }
    });

    return unsubscribe;
  }, [integrationType]);

  // Cleanup pending syncs on unmount
  useEffect(() => {
    return () => {
      cancelPendingSyncs();
    };
  }, []);

  return null;
}
