'use client';

// ==============================================
// Chess Blitz - Game Options Panel
// Color/difficulty selection with navigation
// ==============================================

import type { Difficulty } from '@/types/chess';
import type { Dictionary } from '@/i18n/dictionaries';
import { DIFFICULTY_CONFIGS } from '@/types/chess';
import { useGameOptions } from '@/hooks/useGameOptions';
import styles from '@/app/page.module.scss';

interface GameOptionsPanelProps {
  onBack: () => void;
  isHidden?: boolean;
  dict: Dictionary;
  hideBackButton?: boolean;
}

export function GameOptionsPanel({ onBack, isHidden, dict, hideBackButton }: GameOptionsPanelProps) {
  const {
    selectedColor,
    selectedDifficulty,
    handleColorChange,
    handleDifficultyChange,
    startGame,
  } = useGameOptions();

  // Get difficulty translation key
  const getDifficultyName = (diff: Difficulty) => {
    return dict.difficulty[diff as keyof typeof dict.difficulty] || diff;
  };

  const getDifficultyElo = (diff: Difficulty) => {
    const eloKey = `${diff}Elo` as keyof typeof dict.difficulty;
    return dict.difficulty[eloKey] || DIFFICULTY_CONFIGS[diff].eloRange;
  };

  return (
    <section className={`${styles.gameOptions} ${isHidden ? styles.hidden : styles.visible}`}>
      {/* Back Button - hidden when using header back button */}
      {!hideBackButton && (
        <button className={styles.backButton} onClick={onBack}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>{dict.gameOptions.back}</span>
        </button>
      )}

      {/* Color Selection */}
      <div className={styles.optionGroup}>
        <h3 className={styles.optionLabel}>{dict.gameOptions.chooseSide}</h3>
        <div className={styles.colorOptions}>
          {/* Random Option (Default/Highlighted) */}
          <button
            className={`${styles.colorOption} ${styles.randomOption} ${selectedColor === 'random' ? styles.active : ''}`}
            onClick={() => handleColorChange('random')}
            aria-label={dict.gameOptions.random}
          >
            <div className={styles.colorIcon}>
              {/* Dice/Random icon */}
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
                <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <span className={styles.colorLabel}>{dict.gameOptions.random}</span>
          </button>

          {/* White Option */}
          <button
            className={`${styles.colorOption} ${selectedColor === 'w' ? styles.active : ''}`}
            onClick={() => handleColorChange('w')}
            aria-label={dict.gameOptions.white}
          >
            <div className={styles.colorIcon}>
              <svg viewBox="0 0 45 45" width="32" height="32">
                <g fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10c10.5 1 16.5 8 16 29H7c-.5-21 5.5-28 16-29z" strokeLinecap="butt" />
                  <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" />
                  <circle cx="22" cy="6" r="4" />
                </g>
              </svg>
            </div>
            <span className={styles.colorLabel}>{dict.gameOptions.white}</span>
          </button>

          {/* Black Option */}
          <button
            className={`${styles.colorOption} ${selectedColor === 'b' ? styles.active : ''}`}
            onClick={() => handleColorChange('b')}
            aria-label={dict.gameOptions.black}
          >
            <div className={styles.colorIcon}>
              <svg viewBox="0 0 45 45" width="32" height="32">
                <g fill="#000" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10c10.5 1 16.5 8 16 29H7c-.5-21 5.5-28 16-29z" strokeLinecap="butt" />
                  <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="#fff" />
                  <circle cx="22" cy="6" r="4" stroke="#fff" />
                </g>
              </svg>
            </div>
            <span className={styles.colorLabel}>{dict.gameOptions.black}</span>
          </button>
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className={styles.optionGroup}>
        <h3 className={styles.optionLabel}>{dict.gameOptions.selectDifficulty}</h3>
        <div className={styles.difficultyOptions}>
          {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map((diff) => {
            return (
              <button
                key={diff}
                className={`${styles.difficultyOption} ${selectedDifficulty === diff ? styles.active : ''}`}
                onClick={() => handleDifficultyChange(diff)}
              >
                <span className={styles.difficultyName}>{getDifficultyName(diff)}</span>
                <span className={styles.difficultyElo}>{getDifficultyElo(diff)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Play Button */}
      <button className={styles.playButton} onClick={startGame}>
        <span>{dict.gameOptions.playNow}</span>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </section>
  );
}
