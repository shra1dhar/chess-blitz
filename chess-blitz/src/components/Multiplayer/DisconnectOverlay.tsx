// ==============================================
// Chess Blitz - Disconnect Banner
// Non-blocking notification when opponent disconnects
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

// X icon for dismiss
const XIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function DisconnectOverlay({
  isVisible,
  countdown,
  opponentName = 'Opponent',
}: DisconnectOverlayProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      // Reset dismissed state when visibility changes
      setIsDismissed(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender]);

  // Don't render if dismissed or shouldn't render
  if (!shouldRender || isDismissed) return null;

  // Calculate progress for visual indicator (30 second countdown)
  const progress = countdown !== null ? (countdown / 30) * 100 : 0;
  const isUrgent = countdown !== null && countdown <= 10;
  const circumference = 2 * Math.PI * 17; // radius = 17

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div
      className={`${styles.banner} ${isAnimatingOut ? styles.animateOut : styles.animateIn} ${isUrgent ? styles.urgent : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <WifiOffIcon className={styles.icon} />
          <svg className={styles.progressRing} viewBox="0 0 40 40">
            <circle
              className={styles.progressBg}
              cx="20"
              cy="20"
              r="17"
              fill="none"
              strokeWidth="3"
            />
            <circle
              className={styles.progressBar}
              cx="20"
              cy="20"
              r="17"
              fill="none"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
            />
          </svg>
        </div>

        <div className={styles.textSection}>
          <span className={styles.title}>{opponentName} Disconnected</span>
          <span className={styles.subtitle}>
            {countdown !== null && countdown > 0
              ? `Auto-win in ${countdown}s`
              : 'Waiting for reconnection...'}
          </span>
        </div>
      </div>

      <button
        className={styles.dismissButton}
        onClick={handleDismiss}
        type="button"
        aria-label="Dismiss notification"
      >
        <XIcon className={styles.dismissIcon} />
      </button>
    </div>
  );
}

export default DisconnectOverlay;
