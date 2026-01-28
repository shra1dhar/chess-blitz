'use client';

// ==============================================
// Chess Blitz - Player Info Card Component
// Displays player avatar, name, level/ELO, and status indicators
// ==============================================

import { useState } from 'react';
import { RobotIcon, HumanIcon } from '@/components/icons';
import { formatTime, isLowTime } from '@/utils/clock';
import styles from '@/styles/play.module.scss';

// Status indicator types
type StatusIndicator =
  | { type: 'thinking' }
  | { type: 'yourTurn'; label: string }
  | { type: 'clock'; timeMs: number; isActive: boolean }
  | { type: 'firstMoveWarning'; countdown: number | null; label: string }
  | { type: 'opponentDisconnected'; countdown: number | null; label: string };

interface PlayerInfoCardProps {
  avatarType: 'bot' | 'human';
  /** Optional avatar image URL (e.g., from CrazyGames) */
  avatarUrl?: string;
  name: string;
  subtitle: string;
  isPlayer?: boolean;
  statusIndicator?: StatusIndicator;
}

export function PlayerInfoCard({
  avatarType,
  avatarUrl,
  name,
  subtitle,
  isPlayer = false,
  statusIndicator,
}: PlayerInfoCardProps) {
  const [imageError, setImageError] = useState(false);
  const AvatarIcon = avatarType === 'bot' ? RobotIcon : HumanIcon;

  // Render avatar: image URL if provided and valid, otherwise icon
  const renderAvatar = () => {
    if (avatarUrl && !imageError) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className={styles.avatarImage}
          onError={() => setImageError(true)}
        />
      );
    }
    return <AvatarIcon />;
  };

  // Render the appropriate subtitle or warning
  const renderSubtitle = () => {
    if (statusIndicator?.type === 'firstMoveWarning') {
      return (
        <span className={styles.firstMoveWarning}>
          {statusIndicator.label}
        </span>
      );
    }
    if (statusIndicator?.type === 'opponentDisconnected') {
      return (
        <span className={styles.firstMoveWarning}>
          {statusIndicator.label}
        </span>
      );
    }
    return <span className={styles.playerLevel}>{subtitle}</span>;
  };

  // Render status indicator (thinking dots, turn badge, or clock)
  const renderStatus = () => {
    if (!statusIndicator) return null;

    switch (statusIndicator.type) {
      case 'thinking':
        return (
          <div className={styles.thinkingIndicator}>
            <span className={styles.thinkingDot} />
            <span className={styles.thinkingDot} />
            <span className={styles.thinkingDot} />
          </div>
        );

      case 'yourTurn':
        return <div className={styles.turnIndicator}>{statusIndicator.label}</div>;

      case 'clock': {
        const { timeMs, isActive } = statusIndicator;
        const clockClasses = [
          styles.clock,
          isActive && styles.clockActive,
          isLowTime(timeMs) && styles.clockLow,
        ]
          .filter(Boolean)
          .join(' ');
        return <div className={clockClasses}>{formatTime(timeMs)}</div>;
      }

      case 'firstMoveWarning':
      case 'opponentDisconnected':
        // Warning is shown in subtitle, no additional status needed
        return null;

      default:
        return null;
    }
  };

  return (
    <div className={styles.playerInfo}>
      <div className={`${styles.playerAvatar} ${isPlayer ? styles.playerAvatarHuman : ''}`}>
        {renderAvatar()}
      </div>
      <div className={styles.playerDetails}>
        <span className={styles.playerName}>{name}</span>
        {renderSubtitle()}
      </div>
      {renderStatus()}
    </div>
  );
}
