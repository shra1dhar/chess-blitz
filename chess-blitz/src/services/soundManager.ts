// ==============================================
// Chess Blitz - Sound Manager Service
// ==============================================

export type SoundName =
  | 'move'
  | 'capture'
  | 'checkmate'
  | 'castle'
  | 'promote'
  | 'illegal'
  | 'tick'
  | 'gameStart'
  | 'gameEnd'
  | 'lowTime';

interface SoundConfig {
  src: string;
  volume: number;
  preload: boolean;
}

// Sound configuration with correct file paths
const SOUND_CONFIG: Record<SoundName, SoundConfig> = {
  // Critical sounds - preload immediately (move is used for CTA buttons)
  move: { src: '/sounds/move.wav', volume: 0.5, preload: true },
  // Lazy load game sounds - only needed during gameplay
  capture: { src: '/sounds/capture.wav', volume: 0.6, preload: false },
  illegal: { src: '/sounds/illegal_move.wav', volume: 0.4, preload: false },

  // Aliased sounds - reuse existing files
  castle: { src: '/sounds/move.wav', volume: 0.5, preload: false },
  promote: { src: '/sounds/move.wav', volume: 0.6, preload: false },
  checkmate: { src: '/sounds/game-end.wav', volume: 0.8, preload: false },

  // Secondary sounds - lazy load
  tick: { src: '/sounds/clock-tick.wav', volume: 0.3, preload: false },
  gameStart: { src: '/sounds/game-start.wav', volume: 0.6, preload: false },
  gameEnd: { src: '/sounds/game-end.wav', volume: 0.7, preload: false },
  lowTime: { src: '/sounds/low-time.wav', volume: 0.8, preload: false },
};

class SoundManager {
  private sounds: Map<SoundName, HTMLAudioElement> = new Map();
  private muted: boolean = false;
  private masterVolume: number = 1.0;
  private initialized: boolean = false;

  /**
   * Initialize sound manager and preload critical sounds.
   * Call once on app start.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (typeof window === 'undefined') return;

    const preloadPromises: Promise<void>[] = [];

    for (const [name, config] of Object.entries(SOUND_CONFIG)) {
      if (config.preload) {
        preloadPromises.push(this.loadSound(name as SoundName));
      }
    }

    await Promise.all(preloadPromises);
    this.initialized = true;
    console.log('[SoundManager] Initialized with preloaded sounds');
  }

  /**
   * Load a single sound into the cache.
   */
  private async loadSound(name: SoundName): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve) => {
      const config = SOUND_CONFIG[name];
      const audio = new Audio(config.src);
      audio.volume = config.volume * this.masterVolume;
      audio.preload = 'auto';

      const handleLoad = () => {
        this.sounds.set(name, audio);
        resolve();
      };

      const handleError = () => {
        console.warn(`[SoundManager] Failed to load sound: ${name}`);
        resolve(); // Don't block on failed sounds
      };

      audio.addEventListener('canplaythrough', handleLoad, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      // Trigger load
      audio.load();

      // Timeout fallback in case events don't fire
      setTimeout(() => {
        if (!this.sounds.has(name)) {
          this.sounds.set(name, audio);
          resolve();
        }
      }, 3000);
    });
  }

  /**
   * Play a sound by name.
   * If sound isn't loaded, it will be lazy-loaded first.
   */
  async play(name: SoundName): Promise<void> {
    if (this.muted) return;
    if (typeof window === 'undefined') return;

    // Lazy load if not yet loaded
    if (!this.sounds.has(name)) {
      await this.loadSound(name);
    }

    const audio = this.sounds.get(name);
    if (!audio) return;

    try {
      // Clone audio for overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = SOUND_CONFIG[name].volume * this.masterVolume;
      await clone.play();
    } catch (error) {
      // Autoplay blocked - ignore silently (common before user interaction)
      if ((error as Error).name !== 'NotAllowedError') {
        console.warn(`[SoundManager] Failed to play: ${name}`, error);
      }
    }
  }

  /**
   * Play without waiting (fire and forget).
   * Useful for game sounds that shouldn't block execution.
   */
  playSync(name: SoundName): void {
    this.play(name);
  }

  /**
   * Set muted state.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /**
   * Get current muted state.
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Set master volume (0.0 to 1.0).
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    // Update all loaded sounds
    this.sounds.forEach((audio, name) => {
      audio.volume = SOUND_CONFIG[name].volume * this.masterVolume;
    });
  }

  /**
   * Get current master volume.
   */
  getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Check if manager is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();
