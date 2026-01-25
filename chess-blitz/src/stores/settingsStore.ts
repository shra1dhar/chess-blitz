// ==============================================
// Chess Blitz - Settings Store (Zustand)
// ==============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, BoardTheme, PieceSet } from '@/types/chess';
import { DEFAULT_SETTINGS } from '@/types/chess';

interface SettingsStore extends UserSettings {
  // Actions
  setTheme: (theme: BoardTheme) => void;
  setPieceSet: (pieceSet: PieceSet) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleLegalMoves: () => void;
  toggleAutoQueen: () => void;
  toggleConfirmMoves: () => void;
  setAnimationSpeed: (speed: UserSettings['animationSpeed']) => void;
  resetSettings: () => void;
}

// Check if we're in MSN environment (no localStorage)
const isInMSNEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    // Try to access localStorage
    localStorage.getItem('test');
    return false;
  } catch {
    return true;
  }
};

// Custom storage that works with MSN cloud saves
const createStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  // In MSN environment, we'll use memory storage
  // In the future, this can be replaced with MSN cloud saves
  if (isInMSNEnvironment()) {
    const memoryStorage: Record<string, string> = {};
    return {
      getItem: (name: string) => memoryStorage[name] || null,
      setItem: (name: string, value: string) => {
        memoryStorage[name] = value;
      },
      removeItem: (name: string) => {
        delete memoryStorage[name];
      },
    };
  }

  // Use localStorage in dev/standalone mode
  return {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => localStorage.setItem(name, value),
    removeItem: (name: string) => localStorage.removeItem(name),
  };
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Initial state from defaults
      ...DEFAULT_SETTINGS,

      // Actions
      setTheme: (theme: BoardTheme) => {
        set({ theme });
        // Apply theme to document
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      },

      setPieceSet: (pieceSet: PieceSet) => set({ pieceSet }),

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

      setSoundEnabled: (enabled: boolean) => set({ soundEnabled: enabled }),

      toggleLegalMoves: () => set((state) => ({ showLegalMoves: !state.showLegalMoves })),

      toggleAutoQueen: () => set((state) => ({ autoQueen: !state.autoQueen })),

      toggleConfirmMoves: () => set((state) => ({ confirmMoves: !state.confirmMoves })),

      setAnimationSpeed: (speed: UserSettings['animationSpeed']) =>
        set({ animationSpeed: speed }),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'chess-blitz-settings',
      storage: {
        getItem: (name) => {
          const storage = createStorage();
          const value = storage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          const storage = createStorage();
          storage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          const storage = createStorage();
          storage.removeItem(name);
        },
      },
      // Only persist certain settings (cast needed for Zustand 5 type compatibility)
      partialize: (state) => ({
        theme: state.theme,
        pieceSet: state.pieceSet,
        soundEnabled: state.soundEnabled,
        showLegalMoves: state.showLegalMoves,
        autoQueen: state.autoQueen,
        confirmMoves: state.confirmMoves,
        animationSpeed: state.animationSpeed,
      }) as SettingsStore,
      // Skip hydration to prevent SSR mismatch - rehydrate manually on client
      skipHydration: true,
    }
  )
);

// Note: Rehydration and theme application are handled by AppInitializer
// after React hydration completes to avoid React error #185
