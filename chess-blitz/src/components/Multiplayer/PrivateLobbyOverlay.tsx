'use client';

import { Activity } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { usePrivateLobby } from '@/hooks/usePrivateLobby';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { IntegrationType } from '@/types/integration';
import type { TournamentType } from '@chess-blitz/shared';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './PrivateLobbyOverlay.module.scss';

interface PrivateLobbyOverlayProps {
  integrationType: IntegrationType;
  initialTournamentType?: TournamentType;
  /** Room ID to join (from invite link) - if provided, joins existing lobby instead of creating */
  initialInviteRoomId?: string | null;
  onClose: () => void;
  dict: Dictionary;
  locale: string;
}

export function PrivateLobbyOverlay({
  integrationType,
  initialTournamentType = 'blitz',
  initialInviteRoomId,
  onClose,
  dict,
  locale,
}: PrivateLobbyOverlayProps) {
  const router = useRouter();
  const currentGameId = useMultiplayerStore((s) => s.currentGameId);
  const hasNavigatedRef = useRef(false);

  const privateLobby = usePrivateLobby(integrationType);

  // Auto-create or join lobby on mount (only if not already in a lobby)
  useEffect(() => {
    if (privateLobby.status === 'idle' && !privateLobby.lobbyId) {
      if (initialInviteRoomId) {
        // Join existing lobby (guest clicking invite link)
        privateLobby.joinLobby(initialInviteRoomId);
      } else {
        // Create new lobby (host)
        privateLobby.createLobby(initialTournamentType);
      }
    }
  }, []); // Empty deps - only run once on mount

  // Navigate to game when match found (use effect to avoid side effects during render)
  useEffect(() => {
    if (currentGameId && privateLobby.status === 'starting' && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.push(`/${locale}/play/${currentGameId}`);
    }
  }, [currentGameId, privateLobby.status, router, locale]);

  // If navigating, show nothing
  if (hasNavigatedRef.current) {
    return null;
  }

  const handleClose = () => {
    privateLobby.leaveLobby();
    onClose();
  };

  const handleCopyLink = async () => {
    if (!privateLobby.inviteLink) return;

    try {
      await navigator.clipboard.writeText(privateLobby.inviteLink);
      // Could show a toast notification here
      console.log('[PrivateLobby] Link copied');
    } catch (error) {
      console.error('[PrivateLobby] Failed to copy link:', error);
    }
  };

  const tournamentTypes: TournamentType[] = ['bullet', 'blitz', 'rapid', 'classical'];
  const timeLabels: Record<TournamentType, string> = {
    bullet: '1 min',
    blitz: '3 min',
    rapid: '5 min',
    classical: '10 min',
  };

  return (
    <Activity mode="visible">
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.accentBar} />
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>{dict.tournament.privateLobby}</h2>
            <button
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Status Message */}
          <div className={styles.status}>
            {privateLobby.status === 'waiting' && (
              <p>{dict.tournament.waitingForFriend}</p>
            )}
            {privateLobby.status === 'ready' && privateLobby.guest && (
              <p>{dict.tournament.friendJoined}</p>
            )}
            {privateLobby.status === 'starting' && (
              <p>{dict.tournament.preparingGame}</p>
            )}
          </div>

          {/* Host Info (for guests to see) */}
          {!privateLobby.isHost && privateLobby.host && (
            <div className={styles.playerInfo}>
              {privateLobby.host.platformAvatarUrl && (
                <img
                  src={privateLobby.host.platformAvatarUrl}
                  alt=""
                  className={styles.playerAvatar}
                />
              )}
              <div className={styles.playerDetails}>
                <div className={styles.playerName}>
                  {privateLobby.host.platformUsername || privateLobby.host.displayName}
                </div>
                <div className={styles.playerElo}>
                  {dict.tournament.rating}: {privateLobby.host.elo}
                </div>
              </div>
              <span className={styles.hostBadge}>{dict.tournament.host}</span>
            </div>
          )}

          {/* Guest Info (for host to see) */}
          {privateLobby.guest && (
            <div className={styles.playerInfo}>
              {privateLobby.guest.platformAvatarUrl && (
                <img
                  src={privateLobby.guest.platformAvatarUrl}
                  alt=""
                  className={styles.playerAvatar}
                />
              )}
              <div className={styles.playerDetails}>
                <div className={styles.playerName}>
                  {privateLobby.guest.platformUsername || privateLobby.guest.displayName}
                </div>
                <div className={styles.playerElo}>
                  {dict.tournament.rating}: {privateLobby.guest.elo}
                </div>
              </div>
            </div>
          )}

          {/* Time Control Selector (Host Only) */}
          {privateLobby.isHost && privateLobby.status !== 'starting' && (
            <div className={styles.timeControlSection}>
              <label className={styles.label}>{dict.tournament.selectTimeControl}</label>
              <div className={styles.timeControls}>
                {tournamentTypes.map((type) => (
                  <button
                    key={type}
                    className={`${styles.timeControl} ${
                      privateLobby.tournamentType === type ? styles.active : ''
                    }`}
                    onClick={() => privateLobby.setTournamentType(type)}
                    disabled={privateLobby.status === 'ready'}
                  >
                    <span className={styles.timeControlName}>
                      {dict.tournament[type]}
                    </span>
                    <span className={styles.timeControlTime}>{timeLabels[type]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Guest sees selected time control */}
          {!privateLobby.isHost && (
            <div className={styles.timeControlDisplay}>
              <span className={styles.label}>{dict.tournament.selectTimeControl}:</span>
              <span className={styles.selectedTime}>
                {dict.tournament[privateLobby.tournamentType]} ({timeLabels[privateLobby.tournamentType]})
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actions}>
            {privateLobby.isHost && privateLobby.status === 'ready' && (
              <button
                className={styles.startButton}
                onClick={privateLobby.startGame}
              >
                {dict.tournament.startGame}
              </button>
            )}

            {/* Guest waiting message */}
            {!privateLobby.isHost && privateLobby.status === 'ready' && (
              <div className={styles.waitingMessage}>
                {dict.tournament.waitingForHostToStart || 'Waiting for host to start...'}
              </div>
            )}

            {privateLobby.inviteLink && (
              <button
                className={styles.copyButton}
                onClick={handleCopyLink}
              >
                {dict.tournament.copyInviteLink}
              </button>
            )}
          </div>

          {/* Loading Indicator */}
          {privateLobby.status === 'waiting' && (
            <div className={styles.spinner}>
              <div className={styles.spinnerDot} />
              <div className={styles.spinnerDot} />
              <div className={styles.spinnerDot} />
            </div>
          )}
        </div>
      </div>
    </Activity>
  );
}
