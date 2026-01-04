'use client';

// ==============================================
// Chess Blitz - Multiplayer Sidebar Controls
// Draw and resign buttons for desktop sidebar
// ==============================================

import { HandshakeIcon, FlagIcon } from '@/components/icons';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from '@/styles/play.module.scss';

interface SidebarControlsProps {
  onOfferDraw: () => void;
  onResign: () => void;
  drawOfferedByMe: boolean;
  dict: Dictionary;
}

export function SidebarControls({
  onOfferDraw,
  onResign,
  drawOfferedByMe,
  dict,
}: SidebarControlsProps) {
  return (
    <div className={styles.sidebarControls}>
      <button
        className={`${styles.sidebarButton} ${styles.drawButton}`}
        onClick={onOfferDraw}
        disabled={drawOfferedByMe}
      >
        <HandshakeIcon size={16} />
        {drawOfferedByMe ? dict.controls.drawOffered : dict.controls.offerDraw}
      </button>
      <button className={`${styles.sidebarButton} ${styles.resignButton}`} onClick={onResign}>
        <FlagIcon size={16} />
        {dict.controls.resign}
      </button>
    </div>
  );
}
