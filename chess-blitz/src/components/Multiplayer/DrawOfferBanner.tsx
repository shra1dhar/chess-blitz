// ==============================================
// Chess Blitz - Draw Offer Banner
// Non-blocking notification when opponent offers draw
// Uses React Activity for state preservation
// ==============================================

'use client';

import { Activity } from 'react';
import { useActivityAnimation } from '@/hooks/useActivityAnimation';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './DrawOfferBanner.module.scss';

interface DrawOfferBannerProps {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  dict: Dictionary['draw'];
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
  dict,
}: DrawOfferBannerProps) {
  const { activityMode, isAnimatingOut } = useActivityAnimation({ isVisible });

  return (
    <Activity mode={activityMode}>
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
          <span className={styles.title}>{dict.offered}</span>
          <span className={styles.subtitle}>{dict.opponentOffers}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.acceptButton}`}
          onClick={onAccept}
          type="button"
          aria-label={dict.accept}
        >
          <CheckIcon className={styles.buttonIcon} />
          <span>{dict.accept}</span>
        </button>
        <button
          className={`${styles.button} ${styles.declineButton}`}
          onClick={onDecline}
          type="button"
          aria-label={dict.decline}
        >
          <XIcon className={styles.buttonIcon} />
          <span>{dict.decline}</span>
        </button>
      </div>
      </div>
    </Activity>
  );
}

export default DrawOfferBanner;
