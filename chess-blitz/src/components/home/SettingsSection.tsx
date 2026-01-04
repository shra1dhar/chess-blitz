'use client';

// ==============================================
// Chess Blitz - Settings Section
// Theme and sound settings toggle
// ==============================================

import type { BoardTheme } from '@/types/chess';
import type { Dictionary } from '@/i18n/dictionaries';
import { BOARD_THEMES } from '@/types/chess';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDropdown } from '@/hooks/useDropdown';
import { soundManager } from '@/services/soundManager';
import styles from '@/app/page.module.scss';

interface SettingsSectionProps {
  dict: Dictionary;
}

export function SettingsSection({ dict }: SettingsSectionProps) {
  const { isOpen, isVisible, containerRef, toggle, handleAnimationEnd } = useDropdown();
  const { theme, setTheme, soundEnabled, toggleSound } = useSettingsStore();

  const handleThemeChange = (themeKey: BoardTheme) => {
    soundManager.playSync('move');
    setTheme(themeKey);
  };

  const handleSoundToggle = () => {
    soundManager.playSync('move');
    toggleSound();
  };

  return (
    <div ref={containerRef} className={styles.settingsContainer}>
      {/* Settings Toggle */}
      <button
        className={styles.settingsToggle}
        onClick={toggle}
        aria-expanded={isOpen}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>{dict.settings.settings}</span>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Settings Panel */}
      {isVisible && (
        <section
          className={`${styles.settingsPanel} ${isOpen ? styles.open : styles.closing}`}
          onAnimationEnd={handleAnimationEnd}
        >
          {/* Theme Selection */}
          <div className={styles.settingGroup}>
            <h3 className={styles.settingLabel}>{dict.settings.boardTheme}</h3>
            <div className={styles.themeOptions}>
              {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((themeKey) => {
                const themeName = dict.themes[themeKey as keyof typeof dict.themes] || BOARD_THEMES[themeKey].name;
                const themeDesc = dict.themes[`${themeKey}Desc` as keyof typeof dict.themes] || BOARD_THEMES[themeKey].description;
                return (
                  <button
                    key={themeKey}
                    className={`${styles.themeOption} ${theme === themeKey ? styles.active : ''}`}
                    onClick={() => handleThemeChange(themeKey)}
                    title={themeDesc}
                  >
                    <div className={`theme-swatch theme-swatch--${themeKey}`}>
                      <span className="theme-swatch__grid" />
                    </div>
                    <span className={styles.themeName}>{themeName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound Toggle */}
          <div className={styles.settingGroup}>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>{dict.settings.soundEffects}</span>
              <button
                className={`${styles.toggle} ${soundEnabled ? styles.active : ''}`}
                onClick={handleSoundToggle}
                aria-label={soundEnabled ? dict.settings.disableSound : dict.settings.enableSound}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
