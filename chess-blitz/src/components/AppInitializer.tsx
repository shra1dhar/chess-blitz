'use client';

// ==============================================
// Chess Blitz - App Initializer
// Runs side effects on mount (sound, MSN sync, store hydration, auth)
// ==============================================

import { useEffect, useRef } from 'react';
import { soundManager } from '@/services/soundManager';
import { initStockfish } from '@/services/stockfishService';
import { useMSNAudioSync } from '@/hooks/useSound';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';

// Load MSN SDK dynamically after hydration
function loadMSNSDK() {
  if (typeof window === 'undefined') return;
  if (document.querySelector('script[src*="msstart-games-sdk"]')) return;

  const script = document.createElement('script');
  script.src = 'https://assets.msn.com/staticsb/statics/latest/msstart-games-sdk/msstart-v1.0.0-rc.13.min.js';
  script.async = true;
  document.head.appendChild(script);
}

export function AppInitializer() {
  // Note: lang and dir attributes are set server-side in route group layouts
  // No client-side locale detection needed

  // Rehydrate Zustand stores and load MSN SDK after React hydration completes
  useEffect(() => {
    // Load MSN SDK dynamically
    loadMSNSDK();

    // Rehydrate persisted stores with error handling
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

  // Register service worker for PWA installability
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('SW registration failed:', error);
      });
    }
  }, []);

  // Initialize auth session in background (runs during page transitions)
  const authInitializedRef = useRef(false);
  const initializeSession = useMultiplayerStore((state) => state.initializeSession);

  useEffect(() => {
    // Only initialize once per app lifetime
    if (authInitializedRef.current) return;
    authInitializedRef.current = true;

    // Initialize auth in background - don't await, let it complete during navigation
    initializeSession().catch((error) => {
      console.error('Failed to initialize auth session:', error);
    });
  }, [initializeSession]);

  // Sync with MSN platform audio state
  useMSNAudioSync();

  // Preload Stockfish engine in background (non-blocking)
  // This ensures the engine is ready when user starts a game
  useEffect(() => {
    initStockfish().catch((error) => {
      console.warn('[AppInitializer] Stockfish preload failed:', error);
    });
  }, []);

  return null;
}
