// ==============================================
// Chess Blitz - Mobile Game Controls
// Fixed bottom bar for mobile game actions
// ==============================================

'use client';

import { useState } from 'react';
import styles from './GameControlsMobile.module.scss';

interface GameControlsMobileProps {
  canAbort: boolean;
  canOfferDraw: boolean;
  drawOfferedByMe: boolean;
  isPlaying: boolean;
  onAbort: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
}

// X icon for abort
const AbortIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Handshake for draw
const DrawIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 8c2-2 4-3 7-3v7c0 2-1 3-2 4l-5 4c-1 1-3 0-3-2v-1l-2 2c-1 1-3 0-3-2v-3c0-1 1-2 2-2h4l2-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Flag for resign
const ResignIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Ellipsis for more options
const MoreIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="6" cy="12" r="1.5" fill="currentColor" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

export function GameControlsMobile({
  canAbort,
  canOfferDraw,
  drawOfferedByMe,
  isPlaying,
  onAbort,
  onOfferDraw,
  onResign,
}: GameControlsMobileProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);

  if (!isPlaying) return null;

  const handleResignClick = () => {
    if (confirmResign) {
      onResign();
      setConfirmResign(false);
      setShowMenu(false);
    } else {
      setConfirmResign(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmResign(false), 3000);
    }
  };

  const handleAbortOrDraw = () => {
    if (canAbort) {
      onAbort();
    } else if (canOfferDraw && !drawOfferedByMe) {
      onOfferDraw();
    }
    setShowMenu(false);
  };

  // Determine left button state
  const leftButtonDisabled = !canAbort && (!canOfferDraw || drawOfferedByMe);
  const leftButtonLabel = canAbort ? 'Abort' : (drawOfferedByMe ? 'Draw Offered' : 'Offer Draw');
  const LeftButtonIcon = canAbort ? AbortIcon : DrawIcon;

  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        {/* Left: Abort or Draw */}
        <button
          className={`${styles.button} ${canAbort ? styles.abortButton : styles.drawButton} ${leftButtonDisabled ? styles.disabled : ''}`}
          onClick={handleAbortOrDraw}
          disabled={leftButtonDisabled}
          type="button"
          aria-label={leftButtonLabel}
        >
          <LeftButtonIcon className={styles.icon} />
          <span className={styles.label}>{leftButtonLabel}</span>
        </button>

        {/* Center: More options */}
        <button
          className={`${styles.button} ${styles.moreButton} ${showMenu ? styles.active : ''}`}
          onClick={() => setShowMenu(!showMenu)}
          type="button"
          aria-label="More options"
          aria-expanded={showMenu}
        >
          <MoreIcon className={styles.icon} />
        </button>

        {/* Right: Resign */}
        <button
          className={`${styles.button} ${styles.resignButton} ${confirmResign ? styles.confirmState : ''}`}
          onClick={handleResignClick}
          type="button"
          aria-label={confirmResign ? 'Confirm resign' : 'Resign'}
        >
          <ResignIcon className={styles.icon} />
          <span className={styles.label}>
            {confirmResign ? 'Confirm?' : 'Resign'}
          </span>
        </button>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <div className={styles.menu}>
          <div className={styles.menuBackdrop} onClick={() => setShowMenu(false)} />
          <div className={styles.menuContent}>
            <button
              className={styles.menuItem}
              onClick={() => {
                // Could add more options here in future
                setShowMenu(false);
              }}
              type="button"
            >
              Game Info
            </button>
            <button
              className={styles.menuItem}
              onClick={() => setShowMenu(false)}
              type="button"
            >
              Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameControlsMobile;
