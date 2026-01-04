// ==============================================
// Chess Blitz - Draw Offer Banner
// Non-blocking notification when opponent offers draw
// ==============================================

'use client';

import { useEffect, useState } from 'react';
import styles from './DrawOfferBanner.module.scss';

interface DrawOfferBannerProps {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

// Handshake icon
const HandshakeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 8c2-2 4-3 7-3v7c0 2-1 3-2 4l-5 4c-1 1-3 0-3-2v-1l-2 2c-1 1-3 0-3-2v-3c0-1 1-2 2-2h4l2-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 12H4c-1 0-2 1-2 2v3c0 2 2 3 3 2l2-2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Check icon
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 13l4 4L19 7"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// X icon
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
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function DrawOfferBanner({
  isVisible,
  onAccept,
  onDecline,
}: DrawOfferBannerProps) {
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

  return (
    <div
      className={`${styles.banner} ${isAnimatingOut ? styles.animateOut : styles.animateIn}`}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <HandshakeIcon className={styles.icon} />
        </div>
        <div className={styles.textSection}>
          <span className={styles.title}>Draw Offered</span>
          <span className={styles.subtitle}>Your opponent offers a draw</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.acceptButton}`}
          onClick={onAccept}
          type="button"
          aria-label="Accept draw"
        >
          <CheckIcon className={styles.buttonIcon} />
          <span>Accept</span>
        </button>
        <button
          className={`${styles.button} ${styles.declineButton}`}
          onClick={onDecline}
          type="button"
          aria-label="Decline draw"
        >
          <XIcon className={styles.buttonIcon} />
          <span>Decline</span>
        </button>
      </div>
    </div>
  );
}

export default DrawOfferBanner;
