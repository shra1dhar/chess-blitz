'use client';

// ==============================================
// Chess Blitz - App Initializer
// Runs side effects on mount (sound, MSN sync, store hydration)
// ==============================================

import { useEffect } from 'react';
import { soundManager } from '@/services/soundManager';
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

  // Sync with MSN platform audio state
  useMSNAudioSync();

  return null;
}
