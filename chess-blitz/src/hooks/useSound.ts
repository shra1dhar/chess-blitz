// ==============================================
// Chess Blitz - Sound Hook
// ==============================================

import { useCallback, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { soundManager, type SoundName } from '@/services/soundManager';

interface UseSoundReturn {
  // Generic play method
  playSound: (sound: SoundName) => void;

  // Convenience methods for common sounds
  playMoveSound: () => void;
  playCaptureSound: () => void;
  playCheckmateSound: () => void;
  playCastleSound: () => void;
  playPromoteSound: () => void;
  playIllegalSound: () => void;
  playGameStartSound: () => void;
  playGameEndSound: () => void;
  playTickSound: () => void;
  playLowTimeSound: () => void;

  // Control methods
  setMuted: (muted: boolean) => void;
  isMuted: boolean;
}

export function useSound(): UseSoundReturn {
  const { soundEnabled, setSoundEnabled } = useSettingsStore();

  // Sync muted state with settings store
  useEffect(() => {
    soundManager.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Generic play method
  const playSound = useCallback((sound: SoundName) => {
    soundManager.playSync(sound);
  }, []);

  // Convenience methods
  const playMoveSound = useCallback(() => soundManager.playSync('move'), []);
  const playCaptureSound = useCallback(() => soundManager.playSync('capture'), []);
  const playCheckmateSound = useCallback(() => soundManager.playSync('checkmate'), []);
  const playCastleSound = useCallback(() => soundManager.playSync('castle'), []);
  const playPromoteSound = useCallback(() => soundManager.playSync('promote'), []);
  const playIllegalSound = useCallback(() => soundManager.playSync('illegal'), []);
  const playGameStartSound = useCallback(() => soundManager.playSync('gameStart'), []);
  const playGameEndSound = useCallback(() => soundManager.playSync('gameEnd'), []);
  const playTickSound = useCallback(() => soundManager.playSync('tick'), []);
  const playLowTimeSound = useCallback(() => soundManager.playSync('lowTime'), []);

  // Control method
  const setMuted = useCallback(
    (muted: boolean) => {
      soundManager.setMuted(muted);
      setSoundEnabled(!muted);
    },
    [setSoundEnabled]
  );

  return {
    playSound,
    playMoveSound,
    playCaptureSound,
    playCheckmateSound,
    playCastleSound,
    playPromoteSound,
    playIllegalSound,
    playGameStartSound,
    playGameEndSound,
    playTickSound,
    playLowTimeSound,
    setMuted,
    isMuted: !soundEnabled,
  };
}

// Hook to initialize sound manager
export function useSoundInit(): void {
  useEffect(() => {
    soundManager.init();
  }, []);
}
