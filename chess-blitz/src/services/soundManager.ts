// ==============================================
// Chess Blitz - Sound Manager Service
// Uses Web Audio API when available, falls back to HTMLAudioElement
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

// Check if Web Audio API is supported
function isWebAudioSupported(): boolean {
  return typeof window !== 'undefined' &&
    (typeof AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== 'undefined');
}

// Get AudioContext constructor (with webkit prefix fallback)
function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null;
}

class SoundManager {
  // Web Audio API (modern browsers)
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private soundToBuffer: Map<SoundName, string> = new Map();

  // HTMLAudioElement fallback (older browsers)
  private useWebAudio: boolean = false;
  private htmlAudioElements: Map<SoundName, HTMLAudioElement> = new Map();

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

    // Detect Web Audio API support
    this.useWebAudio = isWebAudioSupported();

    if (this.useWebAudio) {
      const AudioContextClass = getAudioContextClass();
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }

    const preloadPromises: Promise<void>[] = [];

    for (const [name, config] of Object.entries(SOUND_CONFIG)) {
      if (config.preload) {
        preloadPromises.push(this.loadSound(name as SoundName));
      }
    }

    await Promise.all(preloadPromises);
    this.initialized = true;
    console.log(`[SoundManager] Initialized (${this.useWebAudio ? 'Web Audio API' : 'HTMLAudioElement fallback'})`);
  }

  /**
   * Load a single sound into cache.
   */
  private async loadSound(name: SoundName): Promise<void> {
    if (typeof window === 'undefined') return;

    const config = SOUND_CONFIG[name];
    const src = config.src;

    if (this.useWebAudio && this.audioContext) {
      // Web Audio API: Load into AudioBuffer
      if (this.audioBuffers.has(src)) {
        this.soundToBuffer.set(name, src);
        return;
      }

      try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        this.audioBuffers.set(src, audioBuffer);
        this.soundToBuffer.set(name, src);
      } catch (error) {
        console.warn(`[SoundManager] Failed to load sound: ${name}`, error);
      }
    } else {
      // HTMLAudioElement fallback
      await this.loadSoundFallback(name);
    }
  }

  /**
   * Fallback: Load sound using HTMLAudioElement.
   */
  private loadSoundFallback(name: SoundName): Promise<void> {
    return new Promise((resolve) => {
      const config = SOUND_CONFIG[name];
      const audio = new Audio(config.src);
      audio.volume = config.volume * this.masterVolume;
      audio.preload = 'auto';

      const handleLoad = () => {
        this.htmlAudioElements.set(name, audio);
        resolve();
      };

      audio.addEventListener('canplaythrough', handleLoad, { once: true });
      audio.addEventListener('error', () => {
        console.warn(`[SoundManager] Failed to load sound: ${name}`);
        resolve();
      }, { once: true });

      audio.load();

      // Timeout fallback
      setTimeout(() => {
        if (!this.htmlAudioElements.has(name)) {
          this.htmlAudioElements.set(name, audio);
          resolve();
        }
      }, 3000);
    });
  }

  /**
   * Play a sound by name.
   */
  async play(name: SoundName): Promise<void> {
    if (this.muted) return;
    if (typeof window === 'undefined') return;

    if (this.useWebAudio) {
      await this.playWebAudio(name);
    } else {
      await this.playFallback(name);
    }
  }

  /**
   * Play using Web Audio API (no re-download on replay).
   */
  private async playWebAudio(name: SoundName): Promise<void> {
    // Ensure AudioContext is created and resumed
    if (!this.audioContext) {
      const AudioContextClass = getAudioContextClass();
      if (!AudioContextClass) return;
      this.audioContext = new AudioContextClass();
    }

    // Resume if suspended (browsers suspend until user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Lazy load if not yet loaded
    if (!this.soundToBuffer.has(name)) {
      await this.loadSound(name);
    }

    const src = this.soundToBuffer.get(name);
    if (!src) return;

    const buffer = this.audioBuffers.get(src);
    if (!buffer) return;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = SOUND_CONFIG[name].volume * this.masterVolume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
    } catch (error) {
      if ((error as Error).name !== 'NotAllowedError') {
        console.warn(`[SoundManager] Failed to play: ${name}`, error);
      }
    }
  }

  /**
   * Fallback: Play using HTMLAudioElement (may re-download on clone).
   */
  private async playFallback(name: SoundName): Promise<void> {
    if (!this.htmlAudioElements.has(name)) {
      await this.loadSoundFallback(name);
    }

    const audio = this.htmlAudioElements.get(name);
    if (!audio) return;

    try {
      // Clone for overlapping sounds (may re-download in some browsers)
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = SOUND_CONFIG[name].volume * this.masterVolume;
      await clone.play();
    } catch (error) {
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
   * With Web Audio API, volume is applied per-playback via gain nodes.
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
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
