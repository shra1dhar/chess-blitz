// ==============================================
// Chess Blitz - Language Loading Overlay
// Minimal blur + spinner during language transitions
// ==============================================

'use client';

import { useEffect, useState } from 'react';
import styles from './LanguageLoadingOverlay.module.scss';

interface LanguageLoadingOverlayProps {
  isVisible: boolean;
}

export function LanguageLoadingOverlay({ isVisible }: LanguageLoadingOverlayProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, 200); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      className={`${styles.overlay} ${isAnimatingOut ? styles.animateOut : styles.animateIn}`}
      role="status"
      aria-live="polite"
      aria-label="Loading language"
    >
      <div className={styles.spinner} />
    </div>
  );
}

export default LanguageLoadingOverlay;
