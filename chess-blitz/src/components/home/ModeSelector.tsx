'use client';

// ==============================================
// Chess Blitz - Mode Selector
// Game mode selection cards
// ==============================================

import type { Dictionary } from '@/i18n/dictionaries';
import { soundManager } from '@/services/soundManager';
import styles from '@/app/page.module.scss';

type GameMode = 'ai' | 'tournament' | null;

interface ModeSelectorProps {
  onSelect: (mode: GameMode) => void;
  isHidden?: boolean;
  dict: Dictionary;
}

export function ModeSelector({ onSelect, isHidden, dict }: ModeSelectorProps) {
  const handleSelect = (mode: GameMode) => {
    soundManager.playSync('move');
    onSelect(mode);
  };

  return (
    <section className={`${styles.modeSection} ${isHidden ? styles.hidden : styles.visible}`}>
      <h2 className={styles.sectionLabel}>{dict.home.chooseGame}</h2>

      <div className={styles.modeCards}>
        {/* Play vs AI Card */}
        <button
          className={styles.modeCard}
          onClick={() => handleSelect('ai')}
        >
          <div className={styles.modeIcon}>
            {/* Knight icon */}
            <svg viewBox="0 0 45 45" width="48" height="48">
              <g fill="none" fillRule="evenodd" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10c10.5 1 16.5 8 16 29H7c-.5-21 5.5-28 16-29z" fill="currentColor" strokeLinecap="butt" />
                <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="currentColor" />
                <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="currentColor" />
                <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="currentColor" />
              </g>
            </svg>
          </div>
          <h3 className={styles.modeTitle}>{dict.home.playVsComputer}</h3>
          <p className={styles.modeDesc}>{dict.home.playVsComputerDesc}</p>
        </button>

        {/* Tournament Card */}
        <button
          className={styles.modeCard}
          onClick={() => handleSelect('tournament')}
        >
          <div className={styles.modeIcon}>
            {/* Trophy/Crown icon */}
            <svg viewBox="0 0 45 45" width="48" height="48">
              <g fill="none" fillRule="evenodd" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 13l3-3h21l3 3" />
                <path d="M12 10v27h21V10" fill="currentColor" />
                <path d="M9 40h27M12 37h21" />
                <path d="M17.5 20l5-5 5 5M17.5 27l5-5 5 5" />
                <circle cx="22.5" cy="10" r="2" fill="currentColor" />
              </g>
            </svg>
          </div>
          <h3 className={styles.modeTitle}>{dict.home.tournament}</h3>
          <p className={styles.modeDesc}>{dict.home.tournamentDesc}</p>
        </button>
      </div>
    </section>
  );
}
