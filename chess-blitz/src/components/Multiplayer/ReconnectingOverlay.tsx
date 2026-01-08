// ==============================================
// Chess Blitz - Reconnecting Overlay
// Full-screen overlay when player loses connection
// ==============================================

'use client';

import { useEffect, useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './ReconnectingOverlay.module.scss';

interface ReconnectingOverlayProps {
  isVisible: boolean;
  dict: Dictionary;
}

// Wifi icon with animated signal
const WifiIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      className={styles.signal1}
      d="M5 12.55a11 11 0 0114 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      className={styles.signal2}
      d="M1.42 9a16 16 0 0121.16 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      className={styles.signal3}
      d="M8.53 16.11a6 6 0 016.95 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="20" r="1.5" fill="currentColor" />
  </svg>
);

// Spinner
const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.2"
    />
    <path
      d="M12 2a10 10 0 0110 10"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export function ReconnectingOverlay({ isVisible, dict }: ReconnectingOverlayProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [dots, setDots] = useState('');
  const t = dict.reconnecting;

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender]);

  // Animate dots
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      className={`${styles.overlay} ${isAnimatingOut ? styles.animateOut : styles.animateIn}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <WifiIcon className={styles.wifiIcon} />
          <SpinnerIcon className={styles.spinnerIcon} />
        </div>

        <h2 className={styles.title}>{t.title}</h2>
        <p className={styles.subtitle}>
          {t.subtitle.replace('...', '')}<span className={styles.dots}>{dots}</span>
        </p>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} />
          </div>
        </div>

        <p className={styles.hint}>
          {t.hint}
        </p>
      </div>
    </div>
  );
}

export default ReconnectingOverlay;
