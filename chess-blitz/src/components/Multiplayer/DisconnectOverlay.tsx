// ==============================================
// Chess Blitz - Disconnect Overlay
// Shows when opponent disconnects with countdown
// ==============================================

'use client';

import { useEffect, useState } from 'react';
import styles from './DisconnectOverlay.module.scss';

interface DisconnectOverlayProps {
  isVisible: boolean;
  countdown: number | null;
  opponentName?: string;
}

// Wifi off icon
const WifiOffIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1 1l22 22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16.72 11.06A10.94 10.94 0 0119 12.55"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12.55a10.94 10.94 0 015.17-2.39"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.71 5.05A16 16 0 0122.58 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.42 9a15.91 15.91 0 014.7-2.88"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.53 16.11a6 6 0 016.95 0"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="20" r="1" fill="currentColor" />
  </svg>
);

export function DisconnectOverlay({
  isVisible,
  countdown,
  opponentName = 'Opponent',
}: DisconnectOverlayProps) {
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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender]);

  if (!shouldRender) return null;

  // Calculate progress for visual indicator
  const progress = countdown !== null ? (countdown / 30) * 100 : 0;

  return (
    <div
      className={`${styles.overlay} ${isAnimatingOut ? styles.animateOut : styles.animateIn}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <WifiOffIcon className={styles.icon} />
          <svg className={styles.progressRing} viewBox="0 0 60 60">
            <circle
              className={styles.progressBg}
              cx="30"
              cy="30"
              r="26"
              fill="none"
              strokeWidth="4"
            />
            <circle
              className={styles.progressBar}
              cx="30"
              cy="30"
              r="26"
              fill="none"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - progress / 100)}`}
              style={{ '--progress': `${progress}%` } as React.CSSProperties}
            />
          </svg>
        </div>

        <div className={styles.textSection}>
          <h3 className={styles.title}>{opponentName} Disconnected</h3>
          <p className={styles.subtitle}>Waiting for reconnection...</p>
        </div>

        {countdown !== null && countdown > 0 && (
          <div className={styles.countdownWrapper}>
            <span className={styles.countdownNumber}>{countdown}</span>
            <span className={styles.countdownLabel}>seconds</span>
          </div>
        )}

        <p className={styles.forfeitText}>
          {countdown !== null && countdown <= 10
            ? 'Auto-forfeit imminent'
            : 'Will forfeit if not reconnected'}
        </p>
      </div>
    </div>
  );
}

export default DisconnectOverlay;
