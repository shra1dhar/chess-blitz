'use client';

// ==============================================
// Chess Blitz - useGameLifecycle Hook
// Provides game lifecycle event signaling for platform SDKs
// ==============================================

import { useCallback, useRef } from 'react';
import { useIntegration } from './useIntegration';
import { getIntegrationService } from '@/services/integration';

interface UseGameLifecycleReturn {
  /** Signal that loading has started (e.g., engine loading) */
  signalLoadingStart: () => void;
  /** Signal that loading has stopped (e.g., engine ready) */
  signalLoadingStop: () => void;
  /** Signal that gameplay has started (player is actively playing) */
  signalGameplayStart: () => void;
  /** Signal that gameplay has stopped (game over, menu, navigation) */
  signalGameplayStop: () => void;
  /** Trigger celebration for achievements (e.g., checkmate) */
  signalHappyTime: () => void;
  /** Whether the platform supports game lifecycle events */
  hasGameLifecycle: boolean;
}

/**
 * Hook to signal game lifecycle events to platform SDKs
 *
 * Usage:
 * - Call signalLoadingStart() when loading begins (engine, network)
 * - Call signalLoadingStop() when loading completes
 * - Call signalGameplayStart() when the game enters active play state
 * - Call signalGameplayStop() when game ends or user leaves
 * - Call signalHappyTime() on achievements (checkmate, high score)
 *
 * Note: For platforms without lifecycle support, calls are no-ops
 */
export function useGameLifecycle(): UseGameLifecycleReturn {
  const { integrationType } = useIntegration();

  // Track lifecycle state to prevent duplicate calls
  const loadingRef = useRef(false);
  const playingRef = useRef(false);

  const signalLoadingStart = useCallback(() => {
    if (loadingRef.current) return; // Already loading
    loadingRef.current = true;

    const service = getIntegrationService(integrationType);
    if (service.capabilities.hasGameLifecycle && service.loadingStart) {
      service.loadingStart();
    }
  }, [integrationType]);

  const signalLoadingStop = useCallback(() => {
    if (!loadingRef.current) return; // Not loading
    loadingRef.current = false;

    const service = getIntegrationService(integrationType);
    if (service.capabilities.hasGameLifecycle && service.loadingStop) {
      service.loadingStop();
    }
  }, [integrationType]);

  const signalGameplayStart = useCallback(() => {
    if (playingRef.current) return; // Already playing
    playingRef.current = true;

    const service = getIntegrationService(integrationType);
    if (service.capabilities.hasGameLifecycle && service.gameplayStart) {
      service.gameplayStart();
    }
  }, [integrationType]);

  const signalGameplayStop = useCallback(() => {
    if (!playingRef.current) return; // Not playing
    playingRef.current = false;

    const service = getIntegrationService(integrationType);
    if (service.capabilities.hasGameLifecycle && service.gameplayStop) {
      service.gameplayStop();
    }
  }, [integrationType]);

  const signalHappyTime = useCallback(() => {
    const service = getIntegrationService(integrationType);
    if (service.capabilities.hasGameLifecycle && service.happyTime) {
      service.happyTime();
    }
  }, [integrationType]);

  const service = getIntegrationService(integrationType);

  return {
    signalLoadingStart,
    signalLoadingStop,
    signalGameplayStart,
    signalGameplayStop,
    signalHappyTime,
    hasGameLifecycle: service.capabilities.hasGameLifecycle,
  };
}
