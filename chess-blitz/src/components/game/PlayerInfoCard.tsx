'use client';

// ==============================================
// Chess Blitz - Player Info Card Component
// Displays player avatar, name, level/ELO, and status indicators
// ==============================================

import { RobotIcon, HumanIcon } from '@/components/icons';
import { formatTime, isLowTime } from '@/utils/clock';
import styles from '@/styles/play.module.scss';

// Status indicator types
type StatusIndicator =
  | { type: 'thinking' }
  | { type: 'yourTurn'; label: string }
  | { type: 'clock'; timeMs: number; isActive: boolean }
  | { type: 'firstMoveWarning'; countdown: number | null; label: string };

interface PlayerInfoCardProps {
  avatarType: 'bot' | 'human';
  name: string;
  subtitle: string;
  isPlayer?: boolean;
  statusIndicator?: StatusIndicator;
}

export function PlayerInfoCard({
  avatarType,
  name,
  subtitle,
  isPlayer = false,
  statusIndicator,
}: PlayerInfoCardProps) {
  const AvatarIcon = avatarType === 'bot' ? RobotIcon : HumanIcon;

  // Render the appropriate subtitle or warning
  const renderSubtitle = () => {
    if (statusIndicator?.type === 'firstMoveWarning') {
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
        // First move warning is shown in subtitle, no additional status needed
        return null;

      default:
        return null;
    }
  };

  return (
    <div className={styles.playerInfo}>
      <div className={`${styles.playerAvatar} ${isPlayer ? styles.playerAvatarHuman : ''}`}>
        <AvatarIcon />
      </div>
      <div className={styles.playerDetails}>
        <span className={styles.playerName}>{name}</span>
        {renderSubtitle()}
      </div>
      {renderStatus()}
    </div>
  );
}
