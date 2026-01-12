'use client';

// ==============================================
// Chess Blitz - Engine Status Indicator
// Subtle indicator for Stockfish loading state
// ==============================================

import { useState, useEffect } from 'react';
import { getStatus, initStockfish } from '@/services/stockfishService';
import styles from './EngineStatusIndicator.module.scss';

interface Props {
  loadingText?: string;
  readyText?: string;
  showWhenReady?: boolean;
}

export function EngineStatusIndicator({
  loadingText = 'Loading engine...',
  readyText = 'Engine ready',
  showWhenReady = false,
}: Props) {
  const [isReady, setIsReady] = useState(() => getStatus().isReady);
  const [showReady, setShowReady] = useState(false);

  useEffect(() => {
    // Check if already ready
    if (getStatus().isReady) {
      setIsReady(true);
      return;
    }

    // Wait for engine to be ready
    initStockfish()
      .then(() => {
        setIsReady(true);
        if (showWhenReady) {
          setShowReady(true);
          // Hide "ready" message after 2 seconds
          const timeout = setTimeout(() => setShowReady(false), 2000);
          return () => clearTimeout(timeout);
        }
      })
      .catch(() => {
        // Silently fail - engine will retry when game starts
      });
  }, [showWhenReady]);

  // Don't render if ready and not showing ready state
  if (isReady && !showReady) return null;

  return (
    <div className={styles.indicator}>
      <span className={styles.dot} />
      <span className={styles.text}>
        {isReady ? readyText : loadingText}
      </span>
    </div>
  );
}
