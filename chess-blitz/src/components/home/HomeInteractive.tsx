'use client';

// ==============================================
// Chess Blitz - Home Interactive Component
// Client-side interactions for homepage
// Uses React Activity for state preservation
// ==============================================

import { useState, useEffect } from 'react';
import { Activity } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ModeSelector } from './ModeSelector';
import { GameOptionsPanel } from './GameOptionsPanel';
import { SettingsSection } from './SettingsSection';
import styles from '@/app/page.module.scss';

type GameMode = 'ai' | 'tournament' | null;

interface HomeInteractiveProps {
  dict: Dictionary;
}

export function HomeInteractive({ dict }: HomeInteractiveProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params.lang as Locale) || 'en';
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const showHero = gameMode === null && !isTransitioning;

  // Toggle hero visibility via DOM (hero is server-rendered)
  useEffect(() => {
    const heroEl = document.getElementById('hero-section');
    if (heroEl) {
      if (showHero) {
        heroEl.classList.remove(styles.heroHidden);
        heroEl.classList.add(styles.heroVisible);
      } else {
        heroEl.classList.remove(styles.heroVisible);
        heroEl.classList.add(styles.heroHidden);
      }
    }
  }, [showHero]);

  const handleModeSelect = (mode: GameMode) => {
    if (mode === 'tournament') {
      router.push(`/${locale}/tournament`);
      return;
    }
    setIsTransitioning(true);
    // Small delay to allow fade-out animation
    setTimeout(() => {
      setGameMode(mode);
      setIsTransitioning(false);
    }, 250);
  };

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setGameMode(null);
      setIsTransitioning(false);
    }, 250);
  };

  return (
    <>
      {/* Header Row - Fixed Top */}
      <div className={styles.headerRow}>
        {/* Back Button - only when AI mode */}
        {gameMode === 'ai' && (
          <button className={styles.headerBackButton} onClick={handleBack}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>{dict.gameOptions.back}</span>
          </button>
        )}

        {/* Spacer when no back button */}
        {gameMode !== 'ai' && <div />}

        {/* Right side controls */}
        <div className={styles.headerControls}>
          <LanguageSelector dict={dict} />
          <SettingsSection dict={dict} />
        </div>
      </div>

      <div className={styles.container}>
        {/* Mode Selection - always rendered, visibility controlled by Activity */}
        <Activity mode={gameMode === null ? 'visible' : 'hidden'}>
          <ModeSelector
            onSelect={handleModeSelect}
            isHidden={isTransitioning}
            dict={dict}
          />
        </Activity>

        {/* Game Options - always rendered, visibility controlled by Activity */}
        {/* State (color/difficulty selections) is preserved when switching back */}
        <Activity mode={gameMode === 'ai' ? 'visible' : 'hidden'}>
          <GameOptionsPanel
            onBack={handleBack}
            isHidden={isTransitioning}
            dict={dict}
            hideBackButton
          />
        </Activity>
      </div>
    </>
  );
}
