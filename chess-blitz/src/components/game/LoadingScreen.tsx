'use client';

// ==============================================
// Chess Blitz - Loading Screen Component
// Shared loading state for game pages
// ==============================================

import styles from '@/styles/play.module.scss';

interface LoadingScreenProps {
  message: string;
  showBackButton?: boolean;
  backLabel?: string;
  onBack?: () => void;
}

export function LoadingScreen({
  message,
  showBackButton = false,
  backLabel = 'Back',
  onBack,
}: LoadingScreenProps) {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>{message}</p>
        {showBackButton && onBack && (
          <button onClick={onBack} className={styles.backButton} style={{ marginTop: '1rem' }}>
            {backLabel}
          </button>
        )}
      </div>
    </div>
  );
}
