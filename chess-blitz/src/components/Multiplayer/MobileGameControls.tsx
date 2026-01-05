'use client';

// ==============================================
// Chess Blitz - Multiplayer Mobile Controls
// Draw and resign icon buttons for mobile view
// ==============================================

import { HandshakeIcon, FlagIcon } from '@/components/icons';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from '@/styles/play.module.scss';

interface MobileGameControlsProps {
  onOfferDraw: () => void;
  onResign: () => void;
  drawOfferedByMe: boolean;
  dict: Dictionary;
}

export function MobileGameControls({
  onOfferDraw,
  onResign,
  drawOfferedByMe,
  dict,
}: MobileGameControlsProps) {
  return (
    <div className={styles.gameControlsRow}>
      <button
        className={`${styles.controlButton} ${styles.controlButtonDraw}`}
        onClick={onOfferDraw}
        disabled={drawOfferedByMe}
        title={drawOfferedByMe ? dict.controls.drawOffered : dict.controls.offerDraw}
        aria-label={drawOfferedByMe ? dict.controls.drawOffered : dict.controls.offerDraw}
      >
        <HandshakeIcon />
        <span>{drawOfferedByMe ? dict.controls.drawOffered : dict.controls.offerDraw}</span>
      </button>
      <button
        className={`${styles.controlButton} ${styles.controlButtonResign}`}
        onClick={onResign}
        title={dict.controls.resign}
        aria-label={dict.controls.resign}
      >
        <FlagIcon />
        <span>{dict.controls.resign}</span>
      </button>
    </div>
  );
}
