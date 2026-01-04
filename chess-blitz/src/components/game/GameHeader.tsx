'use client';

// ==============================================
// Chess Blitz - Game Header Component
// Back button, title, and spacer
// ==============================================

import { BackArrowIcon } from '@/components/icons';
import styles from '@/styles/play.module.scss';

interface GameHeaderProps {
  title: string;
  backLabel: string;
  onBack: () => void;
}

export function GameHeader({ title, backLabel, onBack }: GameHeaderProps) {
  return (
    <header className={styles.header}>
      <button className={styles.backButton} onClick={onBack}>
        <BackArrowIcon />
        <span>{backLabel}</span>
      </button>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.spacer} />
    </header>
  );
}
