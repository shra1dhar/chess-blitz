'use client';

import { Activity } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './ResignConfirmModal.module.scss';

interface ResignConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  dict: Dictionary;
}

// Resign Icon - White flag with fallen king piece
function ResignIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.iconSvg}>
      <defs>
        <linearGradient id="resignFlag" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8e8e8" />
        </linearGradient>
        <linearGradient id="resignPole" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b7355" />
          <stop offset="100%" stopColor="#6b5344" />
        </linearGradient>
        <linearGradient id="resignKing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c0392b" />
          <stop offset="100%" stopColor="#922b21" />
        </linearGradient>
      </defs>
      {/* Flag pole */}
      <rect x="16" y="8" width="4" height="48" rx="2" fill="url(#resignPole)" />
      {/* White flag */}
      <path
        d="M20 10 L20 32 Q32 28 44 32 L44 10 Q32 14 20 10 Z"
        fill="url(#resignFlag)"
        stroke="#d0d0d0"
        strokeWidth="1"
      />
      {/* Flag wave detail */}
      <path
        d="M24 16 Q30 18 36 16 M24 22 Q30 24 36 22"
        stroke="#e0e0e0"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Fallen king piece (tilted) */}
      <g transform="translate(38 42) rotate(-25)">
        <ellipse cx="8" cy="16" rx="6" ry="2" fill="#922b21" opacity="0.5" />
        <path d="M4 14 L5 6 L11 6 L12 14 Z" fill="url(#resignKing)" />
        <circle cx="8" cy="4" r="3" fill="url(#resignKing)" />
        <path d="M8 1 L8 -2 M6 0 L10 0" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function ResignConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  dict,
}: ResignConfirmModalProps) {
  return (
    <Activity mode={isOpen ? 'visible' : 'hidden'}>
      <div className={styles.overlay} onClick={onCancel} role="dialog" aria-modal="true">
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Accent bar at top */}
          <div className={styles.accentBar} />

          {/* Icon */}
          <div className={styles.iconWrapper}>
            <ResignIcon />
          </div>

          {/* Title & Message */}
          <h2 className={styles.title}>{dict.controls.resign}</h2>
          <p className={styles.message}>{dict.play.resignConfirm}</p>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={`${styles.button} ${styles.buttonConfirm}`}
              onClick={onConfirm}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {dict.controls.resign}
            </button>
            <button
              className={`${styles.button} ${styles.buttonCancel}`}
              onClick={onCancel}
            >
              {dict.gameOptions.back}
            </button>
          </div>
        </div>
      </div>
    </Activity>
  );
}