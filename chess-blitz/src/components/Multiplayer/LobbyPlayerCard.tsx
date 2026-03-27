// ==============================================
// Chess Blitz - Lobby Player Card
// Premium player card with avatar for private lobby
// ==============================================

'use client';

import { useState } from 'react';
import { HumanIcon } from '@/components/icons/GameIcons';
import type { LobbyPlayerInfo } from '@/hooks/usePrivateLobby';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './PrivateLobbyScreen.module.scss';

interface LobbyPlayerCardProps {
  /** Player info, or null if waiting */
  player: LobbyPlayerInfo | null;
  /** Whether this player is the host */
  isHost?: boolean;
  /** Whether we're waiting for this player to join */
  isWaiting?: boolean;
  /** Dictionary for translations */
  dict: Dictionary;
}

export function LobbyPlayerCard({
  player,
  isHost = false,
  isWaiting = false,
  dict,
}: LobbyPlayerCardProps) {
  const [imageError, setImageError] = useState(false);

  // Display name: prefer platform username, fallback to displayName
  const displayName = player?.platformUsername || player?.displayName;
  const avatarUrl = player?.platformAvatarUrl;
  const showAvatar = avatarUrl && !imageError;

  if (isWaiting || !player) {
    return (
      <div className={`${styles.playerCard} ${styles.waiting}`}>
        <div className={styles.avatarContainer}>
          <div className={`${styles.avatar} ${styles.avatarPlaceholder}`}>
            <HumanIcon size={36} className={styles.avatarIcon} />
          </div>
          <div className={styles.pulseRing} />
        </div>
        <div className={styles.playerDetails}>
          <span className={styles.waitingText}>
            {dict.tournament.waitingForPlayer || 'Waiting for player...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.playerCard}>
      <div className={styles.avatarContainer}>
        {showAvatar ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className={styles.avatar}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`${styles.avatar} ${styles.avatarFallback}`}>
            <HumanIcon size={36} className={styles.avatarIcon} />
          </div>
        )}
        {isHost && (
          <span className={styles.hostBadge}>
            {dict.tournament.host || 'Host'}
          </span>
        )}
      </div>
      <div className={styles.playerDetails}>
        <span className={styles.playerName}>{displayName}</span>
        <span className={styles.playerElo}>
          {dict.tournament.rating}: {player.elo}
        </span>
      </div>
    </div>
  );
}
