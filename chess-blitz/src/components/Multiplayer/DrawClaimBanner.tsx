// ==============================================
// Chess Blitz - Draw Claim Banner
// Banner for claiming draws (50-move or threefold)
// ==============================================

'use client';

import { useEffect, useState } from 'react';
import type { DrawClaimType } from '@/hooks/useMultiplayer';
import styles from './DrawClaimBanner.module.scss';

interface DrawClaimBannerProps {
  claimType: DrawClaimType;
  onClaim: (reason: 'fifty_move' | 'threefold_repetition') => void;
}

// Repeat/cycle icon for threefold
const RepeatIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17 1l4 4-4 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 11V9a4 4 0 014-4h14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 23l-4-4 4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 13v2a4 4 0 01-4 4H3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Counter/50 icon
const CounterIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="3"
      stroke="currentColor"
      strokeWidth="2"
    />
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fill="currentColor"
      fontSize="10"
      fontWeight="bold"
      fontFamily="system-ui"
    >
      50
    </text>
  </svg>
);

// Info icon
const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 16v-4M12 8h.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// Handshake icon for claim button
const ClaimIcon = ({ className }: { className?: string }) => (
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

const CLAIM_INFO = {
  fifty_move: {
    title: '50-Move Rule',
    subtitle: 'No captures or pawn moves in 50 moves',
    tooltip: 'The game can be declared a draw if the last 50 moves by each player have been made without any pawn movement or capture.',
    Icon: CounterIcon,
  },
  threefold_repetition: {
    title: 'Threefold Repetition',
    subtitle: 'Position repeated 3 times',
    tooltip: 'The game can be declared a draw when the same position occurs three times with the same player to move.',
    Icon: RepeatIcon,
  },
};

export function DrawClaimBanner({ claimType, onClaim }: DrawClaimBannerProps) {
  const [shouldRender, setShouldRender] = useState(claimType !== 'none');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (claimType !== 'none') {
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
  }, [claimType, shouldRender]);

  if (!shouldRender || claimType === 'none') return null;

  const info = CLAIM_INFO[claimType];
  const Icon = info.Icon;

  const handleClaim = () => {
    onClaim(claimType as 'fifty_move' | 'threefold_repetition');
  };

  return (
    <div
      className={`${styles.banner} ${isAnimatingOut ? styles.animateOut : styles.animateIn}`}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <Icon className={styles.icon} />
        </div>
        <div className={styles.textSection}>
          <div className={styles.titleRow}>
            <span className={styles.title}>{info.title}</span>
            <button
              className={styles.infoButton}
              onClick={() => setShowTooltip(!showTooltip)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              type="button"
              aria-label="More information"
            >
              <InfoIcon className={styles.infoIcon} />
            </button>
            {showTooltip && (
              <div className={styles.tooltip} role="tooltip">
                {info.tooltip}
              </div>
            )}
          </div>
          <span className={styles.subtitle}>{info.subtitle}</span>
        </div>
      </div>

      <button
        className={styles.claimButton}
        onClick={handleClaim}
        type="button"
      >
        <ClaimIcon className={styles.claimIcon} />
        <span>Claim Draw</span>
      </button>
    </div>
  );
}

export default DrawClaimBanner;
